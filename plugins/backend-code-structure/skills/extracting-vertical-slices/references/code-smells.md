# Code Smells and Refactoring

After creating a vertical slice, analyze it for code smells and refactor. This is the step most teams skip.

## When to Refactor

Refactor after EVERY feature:
1. Get tests passing (green)
2. Analyze code smells
3. Refactor based on smells
4. Verify tests still pass

## Common Smells and Solutions

### Long Method / Long Handler

**Smell**: The handler is more than 30 lines, or has several levels of indentation.

**Solution 1**: Extract methods within the handler.
```text
before:
  handle(command: CreateOrder) -> OrderCreated | ValidationError | NotFound | BusinessError
    // 50 lines of mixed validation, data access and logic

after:
  handle(command: CreateOrder) -> OrderCreated | ValidationError | NotFound | BusinessError
    validate(command)                    // -> void | ValidationError
    context = loadContext(command)       // -> OrderContext | NotFound
    order = decide(context)              // -> Order | BusinessError
    return response(order)
```

**Solution 2**: Push behavior down, to domain objects.
```text
before:                                  // the rules live in the handler
  handle(command: ApproveOrder) -> void | InvalidStatus | RequiresManager
    order = orders.findById(command.orderId)
    if order.status != pending: fail InvalidStatus
    if order.total > 10000 and not order.hasManagerApproval: fail RequiresManager
    order.status = approved
    order.approvedAt = now

after:                                   // the rules live in Order
  handle(command: ApproveOrder) -> void | InvalidStatus | RequiresManager
    order = orders.findById(command.orderId)
    order.approve(now)                   // -> void | InvalidStatus | RequiresManager
    orders.save(order)
```

### Duplicated Code

**Smell**: The same code appears in several handlers.

**Solution 1**: Move a duplicated read into the repository, and call it from each handler. A handler never calls another handler.
```text
before:
  handlerA: approved = orders.findMany(status: approved)
  handlerB: approved = orders.findMany(status: approved)

after:
  repository Orders
    findApproved() -> Order[]
  handlerA: approved = orders.findApproved()
  handlerB: approved = orders.findApproved()
```

**Solution 2**: Move shared business logic into a domain service.
```text
domain service OrderApprover
  approve(order: Order) -> void | ApprovalError
```

### Feature Envy

**Smell**: The handler changes many fields of another object.

**Solution**: Move the logic into the object being changed.
```text
before:
  order.status = shipped
  order.shippedAt = now
  order.trackingNumber = tracking
  for item in order.items: item.status = shipped

after:
  order.ship(tracking, now)
  orders.save(order)
```

### Primitive Obsession

**Smell**: Primitives where a domain type belongs.

**Solution**: Create value objects, or branded types.
```text
before:  CreateOrder { customerId: string, amount: number }
after:   CreateOrder { customerId: CustomerId, amount: Money }
```

### God Class / Service Manager

**Smell**: One class handles many unrelated operations.

**Solution**: Split it into one slice per use case.
```text
before:  OrderService with createOrder, updateOrder, getOrder, listOrders, approveOrder, shipOrder, ...

after:   orders/
         ├── create-order
         ├── update-order
         ├── get-order
         ├── approve-order
         └── ship-order
```

### Conditional Complexity

**Smell**: A long if/else or switch.

**Solution 1**: A strategy per case.
```text
before:
  shipping(type, order) -> number
    if type == standard: return order.weight * 1.5
    if type == express:  return order.weight * 3.0
    ...

after:
  strategies: Map<ShippingType, (Order) -> number>
  shipping(type, order) -> number | UnknownShippingType
    strategy = strategies[type]
    if none(strategy): fail UnknownShippingType(type)
    return strategy(order)
```

**Solution 2**: An exhaustive match on a closed set of cases, so that a new case cannot be missed.
```text
match order.status exhaustively
  pending  -> handlePending(order)
  approved -> handleApproved(order)
  shipped  -> handleShipped(order)
```

## Refactoring Decision Tree

```text
Is the handler > 30 lines?
├─ Yes → Extract methods OR push behavior to the domain
└─ No → Continue

Is the same code in several handlers?
├─ Yes → Move it to the repository or a domain service
└─ No → Continue

Does the handler know too much about another object's internals?
├─ Yes → Move the logic to that object
└─ No → Continue

Are there complex conditionals (> 3 branches)?
├─ Yes → Consider a strategy per case, or an exhaustive match
└─ No → Done
```

### Dead Code After Extraction

**Smell**: Repository methods, service dependencies or fake methods that nothing uses after a slice was extracted.

**Solution**: Delete unused code immediately after extraction.
```text
before:  OrderManagementService(orders: Orders, customers: Customers, promotions: Promotions)
         // promotions was used only by applyPromotion, which is now a slice
after:   OrderManagementService(orders: Orders, customers: Customers)
```

**Checklist after extracting a slice:**
1. Search for the callers of each repository method that the extracted code called.
2. If no other callers exist, delete the method from the interface and the implementation.
3. Delete the matching fake methods.
4. Remove constructor dependencies that the service no longer needs.
5. Update the tests that built the service with the removed dependency.

## When NOT to Refactor

- The code is used in one place only and is readable.
- The refactoring adds abstraction without reducing complexity.
- The "duplication" is coincidental: the same code, for different reasons.
- You are unsure whether it will change: wait for the third occurrence.
