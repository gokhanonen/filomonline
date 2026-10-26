import { LoginThrottlerGuard } from "./login-throttler.guard";

function ctx(body: any, ip = "1.1.1.1") {
  return { switchToHttp: () => ({ getRequest: () => ({ body, ip }) }) } as any;
}

describe("LoginThrottlerGuard", () => {
  it("aynı e-postaya 8 denemeden sonra 429 fırlatır", () => {
    const g = new LoginThrottlerGuard();
    const c = ctx({ email: "brute@test.com" });
    for (let i = 0; i < 8; i++) expect(g.canActivate(c)).toBe(true);
    expect(() => g.canActivate(c)).toThrow(/Çok fazla/);
  });

  it("farklı e-postaları birbirinden bağımsız sayar (aynı IP)", () => {
    const g = new LoginThrottlerGuard();
    for (let i = 0; i < 8; i++) g.canActivate(ctx({ email: "a@test.com" }));
    // a@ doldu ama b@ hâlâ serbest
    expect(() => g.canActivate(ctx({ email: "a@test.com" }))).toThrow();
    expect(g.canActivate(ctx({ email: "b@test.com" }))).toBe(true);
  });

  it("e-posta yoksa IP'ye göre sayar", () => {
    const g = new LoginThrottlerGuard();
    const c = ctx({}, "9.9.9.9");
    for (let i = 0; i < 8; i++) expect(g.canActivate(c)).toBe(true);
    expect(() => g.canActivate(c)).toThrow();
  });
});
