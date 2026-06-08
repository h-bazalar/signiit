import { SignUp } from '@clerk/clerk-react'
import SigniitLogo from '../components/SigniitLogo'

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F4A38',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
    }}>
      <svg style={{ position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)', opacity: 0.05, pointerEvents: 'none' }} width="500" height="500" viewBox="0 0 500 500" fill="none">
        <circle cx="250" cy="250" r="60"  stroke="#5EC9AD" strokeWidth="1"/>
        <circle cx="250" cy="250" r="120" stroke="#5EC9AD" strokeWidth="0.7"/>
        <circle cx="250" cy="250" r="180" stroke="#5EC9AD" strokeWidth="0.5"/>
        <circle cx="250" cy="250" r="240" stroke="#5EC9AD" strokeWidth="0.3"/>
        <line x1="250" y1="10" x2="250" y2="490" stroke="#5EC9AD" strokeWidth="0.3"/>
        <line x1="10"  y1="250" x2="490" y2="250" stroke="#5EC9AD" strokeWidth="0.3"/>
      </svg>
      <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <SigniitLogo variant="dark" size="lg" />
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.3)', margin: 0 }}>
          Creativos con intención para Meta Ads
        </p>
      </div>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          afterSignUpUrl="/"
          appearance={{
            layout: { logoPlacement: 'none', showOptionalFields: false },
            variables: {
              colorPrimary: '#3DAB8E', colorBackground: '#ffffff', colorText: '#0F4A38',
              colorTextSecondary: '#8C8880', colorInputBackground: '#ffffff', colorInputText: '#0F4A38',
              colorDanger: '#C0392B', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px',
            },
            elements: {
              card: { boxShadow: 'none', border: '0.5px solid rgba(15,74,56,0.15)', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '400px', overflow: 'hidden', margin: '0 auto' },
              cardBox: { boxShadow: 'none' },
              header: { display: 'none' },
              headerTitle: { display: 'none' },
              headerSubtitle: { display: 'none' },
              socialButtonsBlockButton: { border: '0.5px solid rgba(15,74,56,0.18)', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontWeight: '400', color: '#0F4A38', background: '#ffffff' },
              dividerText: { fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', color: '#8C8880' },
              formFieldLabel: { fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: '500', color: '#0F4A38' },
              formFieldInput: { border: '0.5px solid rgba(15,74,56,0.18)', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#0F4A38' },
              formButtonPrimary: { background: '#0F4A38', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500', fontSize: '14px' },
              footerActionText: { fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#8C8880' },
              footerActionLink: { color: '#3DAB8E', fontWeight: '500' },
            },
          }}
        />
      </div>
    </div>
  )
}
