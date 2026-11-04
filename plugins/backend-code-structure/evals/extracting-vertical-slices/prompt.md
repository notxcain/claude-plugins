---
allowed_tools: [Read, Glob, Grep, Skill]
---
Refactor this method into a vertical slice. Show only the new slice.

```text
service OrderService(orders: Orders, customers: Customers, mailer: Mailer)
  getOrder(orderId: string) -> Order
    order = orders.findById(orderId)
    if none(order): throw "not found"
    customer = customers.findById(order.customerId)
    order.customerName = customer.name
    return order
```
