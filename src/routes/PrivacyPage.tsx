export function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="problem-subtitle" style={{ marginBottom: '1.5rem' }}>
            Last updated: {lastUpdated}
          </p>

          <div className="faq-list" style={{ gap: '1rem' }}>
            <div className="faq-item" style={{ borderColor: 'var(--color-border)' }}>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                Thank you for using PhotoLineArt. This page explains what information we collect, what we do with it, and how we treat your photos and files.
              </p>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                If you have any questions, you can always reach me at team@photolineart.com.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>1. What we collect</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                <strong>Photos and generated files</strong>
                <br />
                When you use PhotoLineArt:
                <br />
                • You upload one or more photos.
                <br />
                • We use AI to generate line-art images and PDF coloring pages from those photos.
              </p>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                <strong>Basic contact information</strong>
                <br />
                If you choose to have your page or book delivered by email, we collect your email address so we can send you the files and (optionally) updates about the service.
                <br />
                We do not ask for or store things like your physical address or payment details at this stage of the product.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>2. What we do with your photos and files</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                Your photos are used only to:
                <br />
                • Generate line-art outputs and PDF coloring pages.
                <br />
                • Deliver those results back to you (via browser download or email).
                <br />
                We do not sell or share your photos or generated outputs with third-party advertisers or data brokers.
                <br />
                We may occasionally review anonymised output (line-art and palettes) to improve the quality of the service, but we do not use your original photos in public examples without your explicit permission.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>3. How long we keep your photos and files</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                <strong>Single-photo PDF downloads (free trial / one-off pages)</strong>
                <br />
                • We process your photo, generate the line art and PDF, and deliver the result (by download and/or email).
                <br />
                • After successful delivery, we immediately delete your uploaded photo and generated files from our servers as part of our normal cleanup process.
                <br />
                • We do not keep a long-term copy of your original photo or your single-page PDF.
              </p>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                <strong>Multi-page coloring books</strong>
                <br />
                • Immediate deletion: after your book has been generated and delivered, we delete your uploaded photos and the finished book PDF from our servers.
                <br />
                • 30-day re-download option: if you choose this option, we keep your generated book PDF in a secure storage area for up to 30 days so you can re-download it.
                <br />
                • After 30 days, your book file is deleted automatically.
                <br />
                We do not keep your photos or PDFs beyond 30 days in either case.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>4. Email addresses and communication</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                We keep your email address on file so that we can:
                <br />
                • Send you your coloring pages and books.
                <br />
                • Help you if you have trouble accessing your files.
                <br />
                • Occasionally send product updates, tips, or announcements.
                <br />
                You can opt out of non-essential emails at any time. We do not sell or rent your email address to third parties.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>5. Analytics and cookies (minimal)</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                We may use privacy-respecting analytics tools to understand usage and improve the site. These collect aggregated information; we do not use third-party advertising cookies at this stage.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>6. How we protect your data</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                We use HTTPS for data in transit, limit access to stored files to only the systems that need them, and automatically delete files after the time periods described above. No online service can guarantee perfect security, but we minimise what we store and for how long.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>7. Children’s privacy</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                PhotoLineArt is designed for adults, parents and caregivers. If you are under the age of 13 (or the minimum age in your region), please use the site only with a parent or guardian.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>8. Changes to this policy</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                As the app evolves, we may update this Privacy Policy from time to time. When we do, we’ll change the “Last updated” date at the top of this page and, if the changes are significant, we’ll make a note in the app.
              </p>

              <h3 className="problem-subtitle" style={{ marginTop: '1.25rem' }}>9. Contact</h3>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                If you have any questions, concerns, or requests about your data, please contact:
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
