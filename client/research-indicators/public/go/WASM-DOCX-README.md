### Recompile WASM

If you modify the Go code, recompile WASM:

```bash
# In the Go project root directory
GOOS=js GOARCH=wasm go build -o main.wasm main.go

# Copy to Angular
cp main.wasm wasm_exec.js
```
