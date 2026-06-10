import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f0', padding: 24 }}>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/admin" />
    </main>
  );
}
