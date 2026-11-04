---
type: llm
weight: 2
---
PASS if the test passes a fake ProductRepository to the constructor and asserts on the product read back.
FAIL if the test uses vi.mock, vi.mocked or vi.spyOn on the repository, asserts call counts, or shares a mutable fixture reassigned in beforeEach.
