export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/leads/:path*", "/stock/:path*", "/tasks/:path*", "/appointments/:path*"]
};