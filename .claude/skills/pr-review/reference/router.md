# Angular Router v21 — Review Patterns for this Project

When reviewing PR changes that involve routing (`src/app/app.routes.ts` or feature route files):

## Functional guards (not class-based)

Guards must be plain functions (`CanActivateFn`, `CanMatchFn`, `CanDeactivateFn`), not classes implementing deprecated interfaces. Use `inject()` inside the guard function to access services.

```ts
// correct
export const authGuard: CanActivateFn = () => inject(AuthService).isLoggedIn();

// wrong — class-based guard is deprecated in v17+
@Injectable()
export class AuthGuard implements CanActivate { ... }
```

## Route params via signal inputs

`withComponentInputBinding()` is enabled in `app.config.ts`. Route parameters and query params should be read via `input()` signals in the component, not via `ActivatedRoute`.

```ts
// correct
export class ProductComponent {
  readonly id = input<string>(); // bound from :id route param
}

// avoid unless necessary
constructor(private route: ActivatedRoute) {
  this.route.params.subscribe(...)
}
```

## Lazy loading

- Standalone components → `loadComponent: () => import('./path').then(m => m.ComponentName)`
- Feature route groups → `loadChildren: () => import('./routes').then(m => m.featureRoutes)`
- Avoid eagerly importing large feature components in the top-level route array.

## Redirects and default routes

Every route group should have a wildcard (`**`) or redirect catch-all to avoid blank screens on unknown paths.

## No `any` in route data

If route data is used, define a typed interface for it. Do not cast `route.data` to `any`.
