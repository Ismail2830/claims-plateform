'use client';

import { Suspense } from 'react';
import UnifiedLoginForm from '@/app/components/auth/ClientLoginForm';

function LoginFormWithSuspense() {
  return <UnifiedLoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginFormWithSuspense />
    </Suspense>
  );
}