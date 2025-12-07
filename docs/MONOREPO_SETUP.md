# Monorepo Setup with TurboRepo

This project is configured for future monorepo expansion using TurboRepo. Currently, it's a single-package setup, but the infrastructure is ready for splitting into multiple packages.

## Current Structure

```
bookiji/
├── src/              # Main Next.js application
├── tests/           # E2E and unit tests
├── turbo.json       # TurboRepo configuration
└── package.json     # Root package
```

## Future Monorepo Structure

When ready to split, you can organize like this:

```
bookiji/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── admin/            # Admin dashboard (optional separate app)
│   └── docs/             # Documentation site
├── packages/
│   ├── supabase/         # Supabase functions & migrations
│   ├── shared/           # Shared utilities & types
│   ├── ui/               # Shared UI components
│   └── config/           # Shared configs (ESLint, TypeScript, etc.)
├── turbo.json
└── package.json          # Root workspace
```

## TurboRepo Configuration

The `turbo.json` file defines:

- **Pipeline tasks**: build, lint, test, e2e, etc.
- **Dependencies**: Task execution order
- **Caching**: Incremental builds and test caching
- **Remote caching**: Optional cloud cache for CI/CD

### Key Features

1. **Incremental Builds**: Only rebuilds what changed
2. **Parallel Execution**: Runs independent tasks in parallel
3. **Remote Caching**: Share cache across CI runs and team members
4. **Task Dependencies**: Ensures correct build order

## Usage

### Current (Single Package)

```bash
# All commands work as before
npm run build
npm run test
npm run e2e
```

### Future (Multi-Package)

```bash
# Run command in all packages
turbo run build

# Run command in specific package
turbo run build --filter=web

# Run command in package and its dependencies
turbo run build --filter=web...

# Run command with cache
turbo run test --cache-dir=.turbo
```

## Migration Steps (When Ready)

1. **Create workspace structure**:
   ```bash
   mkdir -p apps/web packages/shared
   ```

2. **Move files**:
   - Move `src/` → `apps/web/src/`
   - Move `tests/` → `apps/web/tests/`
   - Extract shared code → `packages/shared/`

3. **Update package.json**:
   ```json
   {
     "workspaces": ["apps/*", "packages/*"],
     "private": true
   }
   ```

4. **Install TurboRepo**:
   ```bash
   npm install -D turbo
   ```

5. **Update scripts**:
   ```json
   {
     "scripts": {
       "build": "turbo run build",
       "test": "turbo run test",
       "dev": "turbo run dev"
     }
   }
   ```

## Benefits

- **Faster CI/CD**: Only rebuild/test what changed
- **Better Organization**: Clear separation of concerns
- **Shared Code**: Reusable components and utilities
- **Independent Deployment**: Deploy apps separately
- **Team Scalability**: Multiple teams can work independently

## CI/CD Integration

TurboRepo works seamlessly with GitHub Actions:

```yaml
- name: Install TurboRepo
  run: npm install -g turbo

- name: Build with cache
  run: turbo run build --cache-dir=.turbo

- name: Run tests
  run: turbo run test --cache-dir=.turbo
```

## Remote Caching (Optional)

Enable remote caching for even faster builds:

1. Sign up at [Vercel](https://vercel.com) or [TurboRepo Cloud](https://turbo.build)
2. Link your repo
3. Add to `turbo.json`:
   ```json
   {
     "remoteCache": {
       "enabled": true,
       "signature": true
     }
   }
   ```

## Resources

- [TurboRepo Documentation](https://turbo.build/repo/docs)
- [TurboRepo GitHub](https://github.com/vercel/turbo)
- [Monorepo Guide](https://turbo.build/repo/docs/handbook)
