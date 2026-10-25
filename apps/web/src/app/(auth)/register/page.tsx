import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Suspense>
      <SignInForm mode="register" />
    </Suspense>
  );
}
