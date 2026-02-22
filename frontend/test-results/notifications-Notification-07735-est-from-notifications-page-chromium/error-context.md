# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e6]: E
      - heading "Welcome Back" [level=1] [ref=e7]
      - paragraph [ref=e8]: Login to continue building
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: Email
        - textbox "your@email.com" [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]: Password
        - textbox "Enter your password" [ref=e15]
      - button "Login" [ref=e16]
      - paragraph [ref=e17]:
        - text: Don't have an account?
        - link "Register" [ref=e18] [cursor=pointer]:
          - /url: /auth/register
  - button "Open Next.js Dev Tools" [ref=e24] [cursor=pointer]:
    - img [ref=e25]
  - alert [ref=e28]
```