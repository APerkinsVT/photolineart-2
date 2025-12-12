export function AboutPage() {
  return (
    <div className="page">
      <section className="section section--white">
        <div className="container" style={{ maxWidth: '900px' }}>
          <h1 className="section-heading" style={{ marginBottom: '1rem' }}>
            Why I Built PhotoLineArt
          </h1>
          <p className="problem-subtitle" style={{ marginBottom: '1.5rem' }}>
            This app began as an attempt to create a holiday present for my family.
          </p>

          <div className="faq-list" style={{ gap: '1rem' }}>
            <div className="faq-item" style={{ borderColor: 'var(--color-border)' }}>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                Like most families, we have thousands of photos—many of them capturing precious moments—buried deep in our phones and devices. My idea was to use AI to analyze a photo and create a high-fidelity line-art drawing that could be colored with high-quality colored pencils.
              </p>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                The prototype started as a single coloring page with a few tips. Then it grew into a way to create a 10-page coloring book of meaningful moments—something you could print, bind at an office supply store, and give as a real, keepsake gift.
              </p>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                You may notice, in some of the sample pages, a small wooden dory floating at a dock. I built that boat in 2019 with my family’s help. Since then, we’ve spent many hours rowing and sailing together with friends and loved ones. That boat is one of my memorable moments. The photo you see was taken on launch day. Here it is 2 months earlier.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img
                  src="/images/dory-build.png"
                  alt="Dory under construction - 2019"
                  style={{ maxWidth: '420px', width: '50%', borderRadius: '16px', boxShadow: '0 18px 35px rgba(0,0,0,0.08)' }}
                />
          </div>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                My hope is that you’ll find the same kind of joy—and a chance to slow down and “linger” in a few of your own memories—as you turn your photos into coloring pages.
              </p>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8, fontWeight: 700 }}>
                Andy Perkins — developer
              </p>
              <p className="faq-answer" style={{ color: 'var(--color-text-primary)', fontSize: '1rem', lineHeight: 1.8 }}>
                P.S. If you’re wondering: yes, that’s me with the crayfish, walking down a dirt road on a rainy day in Vermont. Enjoy!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
