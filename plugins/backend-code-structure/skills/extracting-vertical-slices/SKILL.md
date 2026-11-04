---
name: extracting-vertical-slices
description: Use when extracting an application service's methods into vertical slices, refactoring to vertical slice architecture, migrating from a layered architecture, or applying CQRS (separate query and command handlers).
---

# Extracting Vertical Slices

Refactor service, manager and helper methods into self-contained vertical slices, organized by feature, not by layer. Examples use typed pseudocode: types, errors and dependencies are written; a step that a library does is a verb.

## Core Pattern

One slice holds its request, its response and its handler.

```text
query GetOrderQuery { orderId: OrderId }            // a branded request type

view OrderView {
  id: OrderId
  status: pending | shipped | delivered
  customerName: string
  items: { productName: string, quantity: number }[]
}

error OrderNotFound { orderId: OrderId }

handler GetOrder(db: Database)                      // dependencies come in through the constructor
  handle(query: GetOrderQuery) -> OrderView | OrderNotFound
    span "orders/get" (orderId: query.orderId)
    row = db.find(order join customer join items, query.orderId)
    if none(row): fail OrderNotFound(query.orderId)
    return view(row)
```

## Refactoring Process

### Step 1: Defactor
Inline every called method and service into the entry point, to see the complete logic of ONE request.

### Step 2: Identify Query vs Command
- **Query**: read-only, few parameters (an id, filters), returns a data view.
- **Command**: changes state, many parameters (form data), returns an id or nothing.

### Step 3: Create a Branded Request Type
```text
query ListOrdersQuery { customerId: CustomerId, status?: OrderStatus }
```
Validate the request's shape at the boundary, where it is parsed into this type.

### Step 4: Define the Response Type
```text
view OrderListView { id: OrderId, status: OrderStatus, total: Money, createdAt: Instant }
```

### Step 5: Create the Handler
```text
handler ListOrders(db: Database)
  handle(query: ListOrdersQuery) -> OrderListView[]
    span "orders/list-orders" (customerId: query.customerId)
    // a query reads the database directly; a command goes through repositories
```

### Step 6: Clean Up Dead Code
After a query moves to direct database access, remove the repository methods that are no longer used:
- Check whether each extracted repository method is called elsewhere.
- Delete unused methods from the repository interface and its implementation.
- Delete the unused fake repository methods.
- Remove dependencies that the original service no longer uses.

### Step 7: Refactor Based on Code Smells
See [code-smells.md](references/code-smells.md) for when and how to refactor further.

## Query vs Command

| Aspect | Query | Command |
|--------|-------|---------|
| Purpose | Read data | Change state |
| Request | Few params | Many params (form data) |
| Response | Data views | Success, id or nothing |
| Data access | Direct database (optimized joins) | Repositories (transactions) |
| Errors | Often none (return empty) | Domain validation errors |
| Side effects | None | Yes |

## Validation

- **Request validation** checks the request on its own, at the boundary: its fields, formats and ranges.
- **Domain validation** checks the request against the loaded state, inside the handler, and is a typed failure:

```text
error InsufficientStock { productId: ProductId, available: number }

checkStock(item: OrderItem) -> void | InsufficientStock
  product = products.findById(item.productId)
  if product.stock < item.quantity: fail InsufficientStock(item.productId, product.stock)
```

## Testing Slices

Test sizes are the ones in `test-design:designing-tests`.

| Slice Type | Test Size | Data Access | Test Approach |
|------------|-----------|-------------|---------------|
| **Query** | Medium | Direct database | A real database; verify the joins |
| **Command** | Small | Repositories | Fake repositories |

## File Organization

```text
application/
└── orders/
    ├── list-orders                    # query + view + handler
    ├── list-orders (medium test)
    ├── create-order                   # command + response + handler + errors
    ├── create-order (small test)
    └── shared/
        ├── order-repository           # for commands
        └── fake-order-repository      # for command tests
```

## Key Principles

1. **One slice per use case.** Handlers are not shared between operations, and a handler never calls another handler.
2. **Consolidated slices.** A slice's request, response and handler live together.
3. **Direct database access for queries.** Optimize with joins; avoid repeated repository calls.
4. **Repositories for commands.** They keep the transaction boundaries and the domain logic.
5. **Tracing.** Every handler runs inside a span named `group/feature`, with the request's ids as attributes.
6. **Branded request types.** A request is its own type, not a bag of primitives.

The stack plugin's skill gives these patterns in its language and libraries.

Project additions: if `.claude/extensions/backend-code-structure/extracting-vertical-slices.md` exists in the project, read it now and follow it as part of this skill.
