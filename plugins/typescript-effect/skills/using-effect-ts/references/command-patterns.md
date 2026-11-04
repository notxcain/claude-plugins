# Command Patterns

Commands change state. They are not safe or idempotent. This is the Effect + Zod form of the command side of `backend-code-structure:extracting-vertical-slices`.

## Key Characteristics

- **Repository pattern** - Use repositories for transactional boundaries and domain logic
- **Branded types** - Use `.brand<'CommandName'>()` for type safety
- **Domain errors** - Return typed errors for validation failures
- **Unit tests with fakes** - Test with fake repositories for fast, focused tests

## Basic Command (Create)

```typescript
// handler.ts
import { z } from "zod"
import { Effect } from 'effect';
import { Data } from 'effect';

export const CreateOrderCommand = z
  .object({
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive()
    })).min(1)
  })
  .brand<'CreateOrderCommand'>();
export type CreateOrderCommand = z.infer<typeof CreateOrderCommand>

export interface CreateOrderResult {
  orderId: string
}

export class CustomerNotFound extends Data.TaggedError("CustomerNotFound")<{ customerId: string }> {}
export class ProductNotFound extends Data.TaggedError("ProductNotFound")<{ productId: string }> {}
export class InsufficientStock extends Data.TaggedError("InsufficientStock")<{
  productId: string
  requested: number
  available: number
}> {}

export type CreateOrderError = CustomerNotFound | ProductNotFound | InsufficientStock

export class CreateOrderCommandHandler {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly productRepo: ProductRepository,
    private readonly orderRepo: OrderRepository
  ) {}

  handle(req: CreateOrderCommand): Effect.Effect<CreateOrderResult, CreateOrderError> {
    return Effect.gen({ self: this }, function* () {
      // Load context
      const customer = yield* this.customerRepo.findById(req.customerId)
      if (!customer) {
        return yield* Effect.fail(new CustomerNotFound({ customerId: req.customerId }))
      }

      // Domain validation (requires loaded context)
      for (const item of req.items) {
        const product = yield* this.productRepo.findById(item.productId)
        if (!product) {
          return yield* Effect.fail(new ProductNotFound({ productId: item.productId }))
        }
        if (product.stock < item.quantity) {
          return yield* Effect.fail(new InsufficientStock({
            productId: item.productId,
            requested: item.quantity,
            available: product.stock
          }))
        }
      }

      // Execute
      const order = yield* this.orderRepo.create({
        customerId: customer.id,
        items: req.items,
        status: "pending"
      })

      return { orderId: order.id }
    }).pipe(
      Effect.withSpan('orders/create', { attributes: { customerId: req.customerId } })
    )
  }
}
```

## Update Command

```typescript
// handler.ts
export const UpdateOrderStatusCommand = z
  .object({
    orderId: z.string().uuid(),
    status: z.enum(["shipped", "delivered", "cancelled"])
  })
  .brand<'UpdateOrderStatusCommand'>();
export type UpdateOrderStatusCommand = z.infer<typeof UpdateOrderStatusCommand>

export class OrderNotFound extends Data.TaggedError("OrderNotFound")<{ orderId: string }> {}
export class InvalidStatusTransition extends Data.TaggedError("InvalidStatusTransition")<{
  from: string
  to: string
}> {}

export type UpdateOrderStatusError = OrderNotFound | InvalidStatusTransition

export class UpdateOrderStatusCommandHandler {
  constructor(private readonly orderRepo: OrderRepository) {}

  handle(req: UpdateOrderStatusCommand): Effect.Effect<void, UpdateOrderStatusError> {
    return Effect.gen({ self: this }, function* () {
      const order = yield* this.orderRepo.findById(req.orderId)
      if (!order) {
        return yield* Effect.fail(new OrderNotFound({ orderId: req.orderId }))
      }

      // Domain validation - delegate to domain object
      const result = order.transitionTo(req.status)
      if (result._tag === "InvalidTransition") {
        return yield* Effect.fail(new InvalidStatusTransition({ from: order.status, to: req.status }))
      }

      yield* this.orderRepo.save(order)
    }).pipe(
      Effect.withSpan('orders/update-status', { attributes: { orderId: req.orderId } })
    )
  }
}
```

## Void Response Commands

Many commands don't return data - success is implied by no error:

```typescript
export class CancelOrderCommandHandler {
  constructor(private readonly orderRepo: OrderRepository) {}

  handle(req: CancelOrderCommand): Effect.Effect<void, OrderNotFound | OrderAlreadyShipped> {
    return Effect.gen({ self: this }, function* () {
      const order = yield* this.orderRepo.findById(req.orderId)
      if (!order) return yield* Effect.fail(new OrderNotFound({ orderId: req.orderId }))
      if (order.status === "shipped") return yield* Effect.fail(new OrderAlreadyShipped({ orderId: req.orderId }))

      order.cancel()
      yield* this.orderRepo.save(order)
    }).pipe(Effect.withSpan('orders/cancel', { attributes: { orderId: req.orderId } }))
  }
}
```

## Command with Complex Business Logic

Push behavior down to domain objects:

```typescript
// handler.ts - Handler stays thin
export class ApproveOrderCommandHandler {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: EventBus
  ) {}

  handle(req: ApproveOrderCommand): Effect.Effect<void, OrderNotFound | ApprovalError> {
    return Effect.gen({ self: this }, function* () {
      const order = yield* this.orderRepo.findById(req.orderId)
      if (!order) return yield* Effect.fail(new OrderNotFound({ orderId: req.orderId }))

      // Complex logic delegated to domain
      const result = order.approve(req.approvedBy, req.notes)
      if (result._tag === "Error") {
        return yield* Effect.fail(new ApprovalError({ reason: result.reason }))
      }

      yield* this.orderRepo.save(order)
      yield* this.eventBus.publish(new OrderApproved({ orderId: order.id }))
    }).pipe(Effect.withSpan('orders/approve', { attributes: { orderId: req.orderId } }))
  }
}

// domain/order.ts - Domain object has the logic
class Order {
  approve(approver: string, notes?: string): Result<void, string> {
    if (this.status !== "pending") {
      return { _tag: "Error", reason: "Only pending orders can be approved" }
    }
    if (this.total > 10000 && !this.hasManagerApproval) {
      return { _tag: "Error", reason: "Orders over $10,000 require manager approval" }
    }
    this.status = "approved"
    this.approvedBy = approver
    this.approvedAt = new Date()
    this.notes = notes
    return { _tag: "Ok" }
  }
}
```

## Unit Tests with Fakes

Use fake repositories for fast, focused unit tests:

```typescript
// handler.test.ts
import { describe, expect, it } from "vitest"
import { CreateOrderCommand, CreateOrderCommandHandler, CustomerNotFound, InsufficientStock } from "./handler.ts"
import { InMemoryCustomerRepository } from "../shared/in-memory-customer-repository.ts"
import { InMemoryProductRepository } from "../shared/in-memory-product-repository.ts"
import { InMemoryOrderRepository } from "../shared/in-memory-order-repository.ts"

function createTestContext() {
  const customerRepo = new InMemoryCustomerRepository()
  const productRepo = new InMemoryProductRepository()
  const orderRepo = new InMemoryOrderRepository()
  const handler = new CreateOrderCommandHandler(customerRepo, productRepo, orderRepo)
  return { customerRepo, productRepo, orderRepo, handler }
}

describe("CreateOrderCommandHandler", () => {
  it.effect("creates an order", () =>
    Effect.gen(function* () {
      const { customerRepo, productRepo, handler } = createTestContext()

      const customerId = crypto.randomUUID()
      const productId = crypto.randomUUID()

      // Set up fakes
      yield* customerRepo.insert({ id: customerId, name: "Test Customer" })
      yield* productRepo.insert({ id: productId, name: "Test Product", stock: 100 })

      const result = yield* handler.handle(CreateOrderCommand.parse({
        customerId,
        items: [{ productId, quantity: 5 }]
      }))

      expect(result.orderId).toBeDefined()
    })
  )

  it.effect("fails when the customer is not found", () =>
    Effect.gen(function* () {
      const { handler } = createTestContext()

      const result = yield* handler.handle(CreateOrderCommand.parse({
        customerId: crypto.randomUUID(),
        items: [{ productId: crypto.randomUUID(), quantity: 1 }]
      })).pipe(Effect.flip)

      expect(result).toBeInstanceOf(CustomerNotFound)
    })
  )

  it.effect("fails when stock is insufficient", () =>
    Effect.gen(function* () {
      const { customerRepo, productRepo, handler } = createTestContext()

      const customerId = crypto.randomUUID()
      const productId = crypto.randomUUID()

      yield* customerRepo.insert({ id: customerId, name: "Test Customer" })
      yield* productRepo.insert({ id: productId, name: "Test Product", stock: 3 })

      const result = yield* handler.handle(CreateOrderCommand.parse({
        customerId,
        items: [{ productId, quantity: 10 }]
      })).pipe(Effect.flip)

      expect(result).toBeInstanceOf(InsufficientStock)
      expect((result as InsufficientStock).available).toBe(3)
      expect((result as InsufficientStock).requested).toBe(10)
    })
  )
})
```

### Fake Repository Pattern

```typescript
// shared/in-memory-customer-repository.ts
import type { CustomerRepository, Customer } from "./customer-repository.ts"

export class InMemoryCustomerRepository implements CustomerRepository {
  private customers = new Map<string, Customer>()

  insert(customer: Customer): Effect.Effect<void> {
    return Effect.sync(() => { this.customers.set(customer.id, customer) })
  }

  findById(id: string): Effect.Effect<Customer | null> {
    return Effect.sync(() => this.customers.get(id) ?? null)
  }
}
```

## Query-Command Relationship (Edit Screens)

Edit forms: Query output feeds Command input:

```typescript
// get-order-for-edit/handler.ts - Blueprint for the edit command
export interface OrderForEditView {
  orderId: string
  customerId: string
  items: Array<{ productId: string; quantity: number }>
  // Same shape as UpdateOrderCommand
}

// update-order/handler.ts - Matches the edit form
export const UpdateOrderCommand = z
  .object({
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive()
    }))
  })
  .brand<'UpdateOrderCommand'>();
```

## Route Handler Integration

```typescript
// In route registration
const createOrderHandler = new CreateOrderCommandHandler(customerRepo, productRepo, orderRepo)

const CreateOrderRequestBody = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive() })).min(1)
})

app.post('/api/orders', zValidator('json', CreateOrderRequestBody), async (c) => {
  const user = c.get('user')
  const { items } = c.req.valid('json')

  return await Effect.runPromise(
    createOrderHandler.handle({ customerId: user.id, items } as CreateOrderCommand).pipe(
      Effect.map((result) => c.json(result, 201)),
      Effect.catchTags({
        CustomerNotFound: () => Effect.succeed(c.json({ error: 'Customer not found' }, 404)),
        ProductNotFound: (e) => Effect.succeed(c.json({ error: `Product ${e.productId} not found` }, 404)),
        InsufficientStock: (e) => Effect.succeed(c.json({ error: `Insufficient stock for ${e.productId}` }, 400)),
      })
    )
  )
})
```

## Result Type for Complex Responses

When you need success variants with different payloads:

```typescript

export class CreateOrderSuccess extends Data.TaggedClass("CreateOrderSuccess")<{
  orderId: string
  estimatedDelivery: Date
}> {}

export class CreateOrderPartialSuccess extends Data.TaggedClass("CreateOrderPartialSuccess")<{
  orderId: string
  warnings: string[]
}> {}

export type CreateOrderResult = CreateOrderSuccess | CreateOrderPartialSuccess

export class CreateOrderCommandHandler {
  handle(req: CreateOrderCommand): Effect.Effect<CreateOrderResult, CreateOrderError> {
    return Effect.gen({ self: this }, function* () {
      // ... implementation
      if (warnings.length > 0) {
        return new CreateOrderPartialSuccess({ orderId: order.id, warnings })
      }
      return new CreateOrderSuccess({ orderId: order.id, estimatedDelivery })
    })
  }
}
```
