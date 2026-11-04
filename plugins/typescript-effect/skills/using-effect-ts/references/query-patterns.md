# Query Patterns

Queries read data without side effects. They are safe and idempotent. This is the Effect + Zod + Drizzle form of the query side of `backend-code-structure:extracting-vertical-slices`. `./schema` and `./testkit` stand for the project's own schema and test-database modules.

## Key Characteristics

- **Direct DB access** - Use `PostgresJsDatabase<Schema>` for optimized queries
- **Never fail for lists** - Return empty arrays instead of errors
- **Branded types** - Use `.brand<'QueryName'>()` for type safety
- **Integration tests** - Test with real database, not mocks

## Simple Query (Single Entity)

```typescript
// handler.ts
import { z } from "zod"
import { Effect } from 'effect';
import { Data } from 'effect';
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { eq, order, customer } from "./schema"

export const GetOrderQuery = z
  .object({ orderId: z.string().uuid() })
  .brand<'GetOrderQuery'>();
export type GetOrderQuery = z.infer<typeof GetOrderQuery>

export interface OrderView {
  id: string
  status: "pending" | "shipped" | "delivered"
  customerName: string
  items: Array<{ productName: string; quantity: number; price: number }>
  total: number
}

export class OrderNotFound extends Data.TaggedError("OrderNotFound")<{ orderId: string }> {}

export class GetOrderQueryHandler {
  constructor(private readonly db: PostgresJsDatabase<Schema>) {}

  handle(req: GetOrderQuery): Effect.Effect<OrderView, OrderNotFound> {
    return Effect.gen({ self: this }, function* () {
      const rows = yield* Effect.promise(() =>
        this.db
          .select({
            id: order.id,
            status: order.status,
            customerName: customer.name,
            items: order.items,
            total: order.total,
          })
          .from(order)
          .innerJoin(customer, eq(order.customerId, customer.id))
          .where(eq(order.id, req.orderId))
      )

      if (rows.length === 0) {
        return yield* Effect.fail(new OrderNotFound({ orderId: req.orderId }))
      }

      return rows[0] as OrderView
    }).pipe(Effect.withSpan('orders/get', { attributes: { orderId: req.orderId } }))
  }
}
```

## List Query (Never Fails)

List queries return empty arrays instead of errors - this simplifies consumer code.

```typescript
// handler.ts
import { z } from "zod"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { and, eq, isNull, order, customer, sql } from "./schema"

export const ListOrdersQuery = z
  .object({
    customerId: z.string().uuid(),
    organizationId: z.string().uuid(),
    status: z.enum(["pending", "shipped", "delivered"]).optional(),
  })
  .brand<'ListOrdersQuery'>();
export type ListOrdersQuery = z.infer<typeof ListOrdersQuery>

export interface OrderListView {
  id: string
  status: "pending" | "shipped" | "delivered"
  total: number
  itemCount: number
  createdAt: Date
}

export class ListOrdersQueryHandler {
  constructor(private readonly db: PostgresJsDatabase<Schema>) {}

  handle(req: ListOrdersQuery): Effect.Effect<OrderListView[]> {
    const { customerId, organizationId, status } = req

    return Effect.gen({ self: this }, function* () {
      // Single efficient query with JOINs and subquery
      const rows = yield* Effect.promise(() =>
        this.db
          .select({
            id: order.id,
            status: order.status,
            total: order.total,
            createdAt: order.createdAt,
            itemCount: sql<number>`(SELECT COUNT(*) FROM order_item WHERE order_id = ${order.id})`.mapWith(Number),
          })
          .from(order)
          .where(
            and(
              eq(order.customerId, customerId),
              eq(order.organizationId, organizationId),
              isNull(order.deletedAt),
              status ? eq(order.status, status) : undefined
            )
          )
          .orderBy(order.createdAt)
      )

      return rows.map((row) => ({
        id: row.id,
        status: row.status,
        total: row.total,
        itemCount: row.itemCount,
        createdAt: row.createdAt,
      } satisfies OrderListView))
    }).pipe(
      Effect.withSpan('orders/list', { attributes: { customerId, organizationId } })
    )
  }
}
```

## Query with Computed Data

```typescript
export class GetOrderSummaryQueryHandler {
  constructor(private readonly db: PostgresJsDatabase<Schema>) {}

  handle(req: GetOrderSummaryQuery): Effect.Effect<OrderSummaryView> {
    return Effect.gen({ self: this }, function* () {
      // Use SQL aggregations directly
      const result = yield* Effect.promise(() =>
        this.db
          .select({
            totalOrders: sql<number>`COUNT(*)`.mapWith(Number),
            totalSpent: sql<number>`COALESCE(SUM(total), 0)`.mapWith(Number),
            avgOrderValue: sql<number>`COALESCE(AVG(total), 0)`.mapWith(Number),
            lastOrderDate: sql<Date | null>`MAX(created_at)`,
          })
          .from(order)
          .where(eq(order.customerId, req.customerId))
      )

      return {
        totalOrders: result[0]?.totalOrders ?? 0,
        totalSpent: result[0]?.totalSpent ?? 0,
        averageOrderValue: result[0]?.avgOrderValue ?? 0,
        lastOrderDate: result[0]?.lastOrderDate ?? null,
      }
    }).pipe(Effect.withSpan('orders/summary', { attributes: { customerId: req.customerId } }))
  }
}
```

## Integration Tests

Test handlers with real database, not mocks:

```typescript
// handler.integration.test.ts
import { it } from "@effect/vitest"
import { useTestPostgres } from "./testkit"
import { afterEach, describe, expect } from "vitest"
import { ListOrdersQuery, ListOrdersQueryHandler } from "./handler.ts"

describe("ListOrdersQueryHandler Integration Tests", () => {
  const { getDb } = useTestPostgres()

  // Helper functions for test data
  async function createTestCustomer(id: string) {
    const db = getDb()
    await db.insert(customer).values({ id, name: `Customer ${id}` })
  }

  async function createTestOrder(orderId: string, customerId: string, status: string) {
    const db = getDb()
    await db.insert(order).values({ id: orderId, customerId, status, total: 100 })
  }

  afterEach(async () => {
    const db = getDb()
    await db.delete(order)
    await db.delete(customer)
  })

  it.effect("returns the orders of a customer", () =>
    Effect.gen(function* () {
      const handler = new ListOrdersQueryHandler(getDb())

      const customerId = crypto.randomUUID()
      const orgId = crypto.randomUUID()
      const orderId = crypto.randomUUID()

      yield* Effect.promise(() => createTestCustomer(customerId))
      yield* Effect.promise(() => createTestOrder(orderId, customerId, "pending"))

      const result = yield* handler.handle(
        ListOrdersQuery.parse({ customerId, organizationId: orgId })
      )

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe(orderId)
      expect(result[0]?.status).toBe("pending")
    })
  )

  it.effect("returns an empty array when there are no orders", () =>
    Effect.gen(function* () {
      const handler = new ListOrdersQueryHandler(getDb())

      const result = yield* handler.handle(ListOrdersQuery.parse({
        customerId: crypto.randomUUID(),
        organizationId: crypto.randomUUID()
      }))

      expect(result).toHaveLength(0)
    })
  )
})
```

## Query Optimization Tips

1. **Project early** - Select only fields needed for the response
2. **Use JOINs** - Avoid N+1 queries by joining related tables
3. **SQL aggregations** - Use `sql` template for COUNT, SUM, AVG in database
4. **Subqueries for counts** - `sql<number>\`(SELECT COUNT(*) FROM ...)\`.mapWith(Number)`
5. **Consider caching** - Queries are safe to cache since they don't change state

## Route Handler Integration

```typescript
// In route registration
const listOrdersHandler = new ListOrdersQueryHandler(db)

app.get('/api/orders', async (c) => {
  const user = c.get('user')
  const orgId = c.get('organizationId')

  const parseResult = ListOrdersQuery.safeParse({
    customerId: user.id,
    organizationId: orgId,
  })

  if (!parseResult.success) {
    return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400)
  }

  const result = await Effect.runPromise(
    listOrdersHandler.handle(parseResult.data).pipe(
      Effect.map((orders) => c.json(orders, 200))
    )
  )

  return result
})
```
