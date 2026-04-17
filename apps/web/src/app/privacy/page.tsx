export default function PrivacyPage() {
  return (
    <div className="prose prose-invert max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-muted">Last updated: April 2026</p>

      <h2 className="text-lg font-semibold">1. Information We Collect</h2>
      <p className="text-sm text-muted leading-relaxed">
        We collect information you provide directly: email address, display name, and password (stored as
        a secure hash). We also collect transaction data, betting activity, and technical information
        (IP address, browser type, device information).
      </p>

      <h2 className="text-lg font-semibold">2. How We Use Your Information</h2>
      <p className="text-sm text-muted leading-relaxed">
        Your information is used to provide and improve our services, process transactions, prevent fraud,
        comply with legal obligations, and communicate with you about your account.
      </p>

      <h2 className="text-lg font-semibold">3. Data Security</h2>
      <p className="text-sm text-muted leading-relaxed">
        We use industry-standard security measures including encrypted connections (TLS), hashed passwords
        (Argon2id), and secure token management. We never store plaintext passwords.
      </p>

      <h2 className="text-lg font-semibold">4. Data Sharing</h2>
      <p className="text-sm text-muted leading-relaxed">
        We do not sell your personal data. We may share information with service providers who assist in
        operating the Platform, or when required by law.
      </p>

      <h2 className="text-lg font-semibold">5. Cookies</h2>
      <p className="text-sm text-muted leading-relaxed">
        We use httpOnly cookies for authentication. No third-party tracking cookies are used.
      </p>

      <h2 className="text-lg font-semibold">6. Your Rights</h2>
      <p className="text-sm text-muted leading-relaxed">
        You may request access to, correction of, or deletion of your personal data by contacting us.
        You may also close your account at any time.
      </p>

      <h2 className="text-lg font-semibold">7. Changes to Policy</h2>
      <p className="text-sm text-muted leading-relaxed">
        We may update this policy from time to time. We will notify you of material changes via email or
        a notice on the Platform.
      </p>
    </div>
  );
}
