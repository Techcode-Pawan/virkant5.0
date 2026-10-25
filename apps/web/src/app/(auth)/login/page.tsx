import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <SignInForm mode="signin" />
    </Suspense>
  );
}
