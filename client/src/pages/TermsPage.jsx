import React from 'react';
import { Link } from 'react-router-dom';
import FloatingBackground from '../components/FloatingBackground';

const TermsPage = () => {
  return (
    <div className="mychess-auth-page">
      <FloatingBackground />
      <div className="mychess-background-grid" />
      <div className="mychess-glow glow-one" />
      <div className="mychess-glow glow-two" />
      <main className="mychess-auth-container ac-solo">
        <section className="mychess-auth-panel ac-mini ac-legal">
          <div className="mychess-auth-header">
            <div className="mychess-mobile-logo">♞</div>
            <h2>Terms of Service</h2>
            <p>Last updated: September 2026</p>
          </div>

          <div className="ac-legal-body">
            <h3>1. Acceptance of Terms</h3>
            <p>By accessing or using MYCHESS GAMEHUB (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>

            <h3>2. Account Registration</h3>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate information when creating an account.</p>

            <h3>3. Fair Play</h3>
            <p>You agree to play fairly. Cheating, using computer assistance during online matches, botting, exploiting bugs, or engaging in any behavior that undermines fair competition is prohibited and may result in account suspension or termination.</p>

            <h3>4. Acceptable Use</h3>
            <p>You agree not to misuse the Service, including attempting to interfere with servers, transmitting harmful code, or engaging in harassment or abusive behavior toward other players.</p>

            <h3>5. Intellectual Property</h3>
            <p>The Service and its original content, features, and functionality are owned by MYCHESS and are protected by applicable laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service.</p>

            <h3>6. Termination</h3>
            <p>We reserve the right to suspend or terminate your account at our discretion if you violate these Terms or engage in conduct that harms the community.</p>

            <h3>7. Disclaimer of Warranties</h3>
            <p>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express or implied. We do not guarantee uninterrupted or error-free operation.</p>

            <h3>8. Limitation of Liability</h3>
            <p>To the fullest extent permitted by law, MYCHESS shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>

            <h3>9. Changes to These Terms</h3>
            <p>We may update these Terms from time to time. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.</p>

            <h3>10. Contact</h3>
            <p>For questions about these Terms, please contact us through the MYCHESS community.</p>
          </div>

          <div className="ac-backline">
            <Link to="/" className="ac-backlink">← Back to MYCHESS</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TermsPage;
