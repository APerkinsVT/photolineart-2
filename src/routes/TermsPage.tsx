export function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="page">
      <section className="section section--white">
        <div className="container" style={{ maxWidth: '900px' }}>
          <h1 className="section-heading" style={{ marginBottom: '0.5rem' }}>
            Terms of Use
          </h1>
          <p className="problem-subtitle" style={{ marginBottom: '1.5rem' }}>
            Last updated: {lastUpdated}
          </p>

          <div className="faq-list" style={{ gap: '1rem' }}>
            <div className="faq-item" style={{ borderColor: 'var(--color-border)' }}>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                Welcome to PhotoLineArt (“we”, “us”, “our”). These Terms of Use (“Terms”) govern your access to and use of our website and services (the “Service”).
                By using PhotoLineArt, you agree to these Terms. If you do not agree, please do not use the Service.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>1. What PhotoLineArt does</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                PhotoLineArt lets you upload photos and receive:
                <br />
                • Line-art versions of your images, and
                <br />
                • Printable PDF coloring pages and/or coloring books, sometimes with suggested color palettes.
                <br />
                The Service may change over time as we improve or update features.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>2. Who may use the Service</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                You may use PhotoLineArt only if you:
                <br />
                • Are at least 13 years old (or the minimum age in your region), and
                <br />
                • Have the power to enter into a binding agreement with us, and
                <br />
                • Agree to follow these Terms and all applicable laws.
                <br />
                If you are using the Service on behalf of someone else (for example a child or family member), you confirm that you have their permission to do so.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>3. Your photos and content</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                You retain all rights to the photos and other content you upload (“User Content”).
                <br />
                By uploading User Content, you grant us a limited, worldwide, non-exclusive licence to:
                <br />
                • Temporarily store, process and transform your photos using AI models, and
                <br />
                • Generate and deliver line-art images, PDFs, color palettes and related outputs to you.
                <br />
                We use your photos only for providing the Service (and as described in our Privacy Policy). We do not sell your photos or related line art to third parties.
                <br />
                You are responsible for ensuring that:
                <br />
                • You have the necessary rights to upload each photo;
                <br />
                • Your photos do not violate any laws or third-party rights; and
                <br />
                • Your photos are not illegal, harmful, obscene, abusive or otherwise inappropriate.
                <br />
                We may remove or refuse content that we believe violates these Terms or the law.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>4. Usage of generated outputs</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                You may use the line-art images, PDFs and other outputs generated for you for your personal use, including printing, sharing with friends and family, and giving as gifts.
                <br />
                If you want to use outputs commercially (e.g., sell printed books or pages based on PhotoLineArt results), please contact us first to discuss.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>5. Data retention and deletion</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                How we handle your photos, generated files and email address is described in detail in our Privacy Policy, which is part of these Terms.
                <br />
                In short:
                <br />
                • Single-photo jobs: photos and generated files are deleted after delivery.
                <br />
                • Multi-photo books: you may choose immediate deletion or 30-day retention for re-download, after which files are deleted automatically.
                <br />
                • We keep your email address to deliver files and (optionally) send updates.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>6. Acceptable use</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                You agree not to:
                <br />
                • Use the Service for any illegal purpose;
                <br />
                • Upload photos or content that is unlawful, abusive, harassing, defamatory, obscene, or infringes someone else’s rights;
                <br />
                • Attempt to interfere with the security or proper functioning of the Service;
                <br />
                • Reverse engineer or misuse any part of the Service.
                <br />
                We may suspend or terminate access to the Service if we reasonably believe you have violated these Terms.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>7. No warranty</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                The Service is provided “as is” and “as available”. We do not guarantee that:
                <br />
                • The Service will be error-free or uninterrupted;
                <br />
                • The generated line art or colors will meet every expectation;
                <br />
                • Files will always be compatible with every printer or device.
                <br />
                You use PhotoLineArt at your own risk.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>8. Limitation of liability</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                To the maximum extent permitted by law, we (and our contributors, if any) will not be liable for:
                <br />
                • Any indirect, incidental, special or consequential damages; or
                <br />
                • Any loss of data, profits, revenue, or business opportunities;
                <br />
                arising out of or related to your use of the Service.
                <br />
                Where our liability cannot be excluded, it is limited to the amount you have paid us in the last 3 months.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>9. Changes to the Service and these Terms</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                We may update the Service or these Terms from time to time. If we make significant changes, we’ll update the “Last updated” date and may provide a notice on the site. Your continued use of the Service after changes take effect means you accept the updated Terms.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>10. Governing law</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                These Terms are governed by the laws of the State of Vermont, USA (without regard to its conflict-of-laws rules). Any disputes will be handled in the courts located in Vermont, unless applicable law requires otherwise.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>11. Contact</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                If you have questions about these Terms, please contact:
                <br />
                Andy Perkins
                <br />
                Developer, PhotoLineArt
                <br />
                Team@photolineart.com
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
