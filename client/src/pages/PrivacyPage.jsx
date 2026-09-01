import React from 'react';
import { Link } from 'react-router-dom';
import FloatingBackground from '../components/FloatingBackground';

const PrivacyPage = () => {
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
            <h2>Privacy Policy</h2>
            <p>Last updated: September 2026</p>
          </div>

          <div className="ac-legal-body">
            <h3>1. Information We Collect</h3>
            <p>We collect information you provide when creating an account, such as your username, email address, and password (stored securely as a salted hash). We also collect game data such as your match history, ELO rating, and achievements.</p>

            <h3>2. How We Use Your Information</h3>
            <p>Your information is used to operate the Service, provide matchmaking, display your profile and rankings, process in-game purchases, and communicate important updates about your account.</p>

            <h3>3. Data Storage</h3>
            <p>We store your information on secure servers. Passwords are never stored in plain text. We take reasonable measures to protect your data from unauthorized access.</p>

            <h3>4. Communication</h3>
            <p>If you request a password reset, we may send you an email to the address associated with your account. We do not send unsolicited marketing without your consent.</p>

            <h3>5. Sharing of Information</h3>
            <p>We do not sell or rent your personal information. Your public profile (username, ELO, avatar, match history) is visible to other players as part of the Service&apos;s social features.</p>

            <h3>6. Cookies and Local Storage</h3>
            <p>We use browser local storage to keep you signed in and to remember your preferences. You can clear this data through your browser settings.</p>

            <h3>7. Third-Party Services</h3>
            <p>The Service may rely on third-party providers (such as cloud storage and email delivery) to function. These providers process data only to the extent necessary to provide the Service.</p>

            <h3>8. Data Retention</h3>
            <p>Your account data is retained while your account is active. You may request deletion at any time.</p>

            <h3>9. Policy Updates</h3>
            <p>We may update this Privacy Policy periodically. Material changes will be reflected by updating the &quot;last updated&quot; date above.</p>

            <h3>10. Contact</h3>
            <p>If you have questions about your privacy or data, please contact us through the MYCHESS community.</p>
          </div>

          <div className="ac-backline">
            <Link to="/" className="ac-backlink">← Back to MYCHESS</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPage;
