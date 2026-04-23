"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export async function authenticate(_: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return "Ongeldige inloggegevens.";
      }

      return "Er ging iets mis bij het aanmelden.";
    }

    throw error;
  }
}