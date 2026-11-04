---
type: llm
weight: 2
---
PASS if the test uses a fake email sender (a test implementation of the sender interface) and asserts on the message that the fake recorded, such as its recipient or subject.
FAIL if the test asserts a call count or call order (such as "called once" or "toHaveBeenCalledTimes"), or uses a mocking library to replace the sender.
