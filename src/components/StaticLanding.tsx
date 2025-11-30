export function StaticLanding() {
  return (
    <div className="page">
      {/* Header */}
      <header className="site-header">
        <div className="container site-header-inner">
          <div className="wordmark">
            <span>Photo</span>
            <span>LineArt</span>
          </div>
          <nav className="site-nav">
            <a className="site-nav-link" href="#how-it-works">
              How it works
            </a>
            <a className="site-nav-link" href="#examples">
              Examples
            </a>
            <a className="site-nav-link site-nav-login" href="#login">
              Login
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="section section--base">
        <div className="container hero">
          <div className="hero-inner">
            <h1 className="hero-heading">
              Turn one photo into a coloring page you’ll keep forever.
            </h1>

            <p className="hero-lead">
              In minutes, our AI turns a favorite photo into high-fidelity line art,{" "}
              <strong>complete with specific Faber-Castell color tips.</strong> Not generic patterns.
              Your life, on paper. First page is free.
            </p>

            <ul className="hero-bullets">
              <li>
                <strong>Transform</strong> real moments—family, pets, travel—into pages you’ll
                actually want to color.
              </li>
              <li>Get specific pencil guidance matched to your exact photo and Faber-Castell set.</li>
              <li>Download a print-ready PDF and start coloring tonight.</li>
            </ul>

            <div className="hero-cta">
              <a href="#hero-form" className="btn-primary">
                Turn my photo into a free page
              </a>
            </div>

            <p className="hero-meta">No card. One photo. About 2 minutes.</p>
          </div>

          {/* Hero form card */}
          <div id="hero-form" className="hero-form">
            <h3 className="hero-form-title">Start with one photo you love</h3>

            <form id="upload-form">
              <div className="form-field">
                <label className="form-label" htmlFor="email">
                  Email address
                </label>
                <input
                  className="input-text"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
                <p className="form-hint">We’ll send your finished PDF and tips here.</p>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="photo">
                  Upload photo
                </label>
                <input
                  className="input-file"
                  id="photo"
                  name="photo"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  required
                />
                <p className="form-hint">
                  JPG or PNG, up to 10 MB. Clear, well-lit photos work best.
                </p>
              </div>

              <div className="form-field">
                <label className="checkbox-row">
                  <input type="checkbox" />
                  <span>Send me advanced coloring ideas and new layout styles</span>
                </label>
              </div>

              <div className="form-field">
                <button id="submit-button" className="btn-primary" type="submit">
                  Turn my photo into a free page
                </button>
              </div>

              <div id="feedback-message" className="feedback-message hidden" />
            </form>

            <p className="hero-form-footer">
              Your photo stays private. You can delete it with one click.
            </p>
          </div>
        </div>
      </section>

      {/* Problem / agitation */}
      <section className="section section--white">
        <div className="container problem-section">
          <h2 className="section-heading">Why most adult coloring books end up on a shelf</h2>
          <h3 className="problem-subtitle">They calm your hands. Not your heart.</h3>

          <p className="problem-intro">
            You buy a beautiful “adult coloring book,” sit down to relax… and it’s page after page of
            random mandalas, forests, and quotes that mean nothing to you. You color a few, feel oddly
            flat, and the book disappears into a drawer.
          </p>

          <div className="problem-grid">
            <div className="problem-card">
              <p className="problem-card-title">Generic calm</p>
              <p className="problem-card-text">
                You’re coloring someone else’s idea of calm, not your own memories.
              </p>
            </div>
            <div className="problem-card">
              <p className="problem-card-title">Lacks refinement</p>
              <p className="problem-card-text">
                The art feels childish or noisy instead of thoughtful and refined.
              </p>
            </div>
            <div className="problem-card">
              <p className="problem-card-title">Disposable ritual</p>
              <p className="problem-card-text">
                After a week, the book is clutter, not a ritual.
              </p>
            </div>
          </div>

          <p className="problem-outro">
            Now picture this instead: your grandmother’s kitchen, your dog on that favorite trail, or
            the café from your last big trip—quietly waiting on the page, ready to be brought back to
            life, stroke by stroke.
          </p>
        </div>
      </section>

      {/* Solution / how it works */}
      <section id="how-it-works" className="section section--base">
        <div className="container">
          <div className="solution-heading">
            <h2 className="section-heading">A coloring book made from your life</h2>
            <h3 className="solution-subtitle">
              Turn “lost in your camera roll” photos into a ritual you actually look forward to.
            </h3>
          </div>

          <div className="solution-layout">
            <div className="solution-panel">
              <p className="solution-panel-label">Before</p>
              <p>
                Your best moments are buried in phone backups and old albums. They’re important, but{" "}
                <strong>they are rarely seen.</strong>
              </p>
              <hr />
              <p
                className="solution-panel-label"
                style={{ color: "var(--color-cta-primary)", marginTop: "0.75rem" }}
              >
                After
              </p>
              <p>
                PhotoLineArt turns those same moments into gallery-quality line drawings with guided
                colors. You slow down. You remember. You create something <strong>tangible.</strong>
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  fontStyle: "italic",
                  color: "var(--color-text-secondary)",
                  marginTop: "1rem",
                }}
              >
                <span style={{ fontWeight: 600 }}>Bridge:</span> Upload one photo. We handle the line
                art, the layout, and Faber-Castell recommendations tuned to your exact image and
                pencil set.
              </p>
            </div>

            <div className="solution-steps">
              <div className="solution-step">
                <div className="solution-step-number">1</div>
                <h4 className="solution-step-title">Upload a favorite photo</h4>
                <p className="solution-step-text">
                  Choose a clear shot of a person, pet, place, or memory you don’t want to lose to the
                  scroll.
                </p>
              </div>
              <div className="solution-step">
                <div className="solution-step-number">2</div>
                <h4 className="solution-step-title">We create the art and color map</h4>
                <p className="solution-step-text">
                  Our AI converts your photo into detailed line art and a companion page with
                  Faber-Castell suggestions matched to your chosen set.
                </p>
              </div>
              <div className="solution-step">
                <div className="solution-step-number">3</div>
                <h4 className="solution-step-title">Download, print, and start coloring</h4>
                <p className="solution-step-text">
                  Get a high-resolution PDF sized for standard letter/A4. Print at home and start
                  coloring the same day.
                </p>
              </div>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#hero-form" className="btn-primary">
              Show me my photo as line art
            </a>
            <p className="inline-cta-meta">
              Free trial: one full-resolution page + expert tips, no card.
            </p>
          </div>

          <div className="core-benefits">
            <div>
              <p className="core-benefit-title">Deeply personal</p>
              <p className="core-benefit-text">
                Every page starts with a real memory—family, pets, trips, tiny everyday scenes.
              </p>
            </div>
            <div>
              <p className="core-benefit-title">Built for colored pencils</p>
              <p className="core-benefit-text">
                Line weight, detail, and white space tuned for longer, focused sessions.
              </p>
            </div>
            <div>
              <p className="core-benefit-title">Guided, not guessed</p>
              <p className="core-benefit-text">
                Specific Faber-Castell pencil numbers for skin, sky, stone, foliage, and more.
              </p>
            </div>
            <div>
              <p className="core-benefit-title">Gift-ready in an afternoon</p>
              <p className="core-benefit-text">
                Print, bind, and wrap a book that is uniquely yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section id="examples" className="section section--white">
        <div className="container">
          <div className="social-proof-heading">
            <h2 className="section-heading">What people are coloring with PhotoLineArt</h2>
            <h3 className="social-proof-subtitle">Real photos. Real pages. Real rituals.</h3>
          </div>

          <div className="testimonials">
            <blockquote className="testimonial">
              <p>
                “In one evening I turned a folder of old family photos into six pages my sister and I
                now color together on video calls. It feels like visiting our childhood.”
              </p>
              <footer>— Elena K., 52, Seattle</footer>
            </blockquote>
            <blockquote className="testimonial">
              <p>
                “I made a small book from our honeymoon pictures. We color one page every Sunday. It’s
                our reset button.”
              </p>
              <footer>— Marcus L., 38, Chicago</footer>
            </blockquote>
            <blockquote className="testimonial">
              <p>
                “I’m not an artist, but the Faber-Castell tips told me exactly which pencils to use.
                The pages look grown-up, not cutesy. It lives on my coffee table, not in a box.”
              </p>
              <footer>— Priya S., 47, Boston</footer>
            </blockquote>
          </div>

          <div className="stats">
            <div className="stats-inner">
              <p className="stat">
                <span>1000s</span> of pages created
              </p>
              <p className="stat">
                <span>9/10</span> trial users color a page
              </p>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#hero-form" className="btn-primary">
              Create my free coloring page
            </a>
            <p className="inline-cta-meta">Start with one photo that still makes you pause.</p>
          </div>
        </div>
      </section>

      {/* Differentiation / features */}
      <section className="section section--base">
        <div className="container">
          <div className="feature-heading">
            <h2 className="section-heading">Why PhotoLineArt feels different the first time you use it</h2>
            <h3 className="feature-subtitle">
              Not an app to tap through. A tool you sit down with.
            </h3>
          </div>

          <div className="features-grid">
            <div className="feature-block">
              <h4 className="feature-title">1. Line art that actually looks like your photo</h4>
              <div className="art-mock">
                <div className="art-frame">Mock preview: close-up of photo-realistic line art</div>
              </div>
              <p className="feature-text">
                Our AI is tuned for faces, textures, and depth. Wrinkles in a hand. Fur on a dog.
                Light in a window. You recognize the moment immediately—
                <strong style={{ color: "var(--color-accent-clay)" }}>
                  no harsh “cartoon filter” edges.
                </strong>
              </p>
            </div>

            <div className="feature-block">
              <h4 className="feature-title">2. Faber-Castell color maps for each image</h4>
              <div className="art-mock">
                <div
                  className="art-frame"
                  style={{
                    backgroundColor: "#ffffff",
                    borderStyle: "solid",
                    borderWidth: "1px",
                  }}
                >
                  <ul
                    style={{
                      listStyle: "none",
                      paddingLeft: 0,
                      margin: 0,
                      textAlign: "left",
                      fontSize: "0.875rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <li>
                      <strong style={{ color: "var(--color-cta-primary)" }}>
                        SKIN: FC 132 Light Flesh
                      </strong>
                    </li>
                    <li>SHADOW: FC 180 Raw Umber</li>
                    <li>
                      <strong style={{ color: "var(--color-accent-clay)" }}>
                        SKY: FC 143 Cobalt Blue
                      </strong>
                    </li>
                    <li>HIGHLIGHT: FC 101 White</li>
                  </ul>
                </div>
              </div>
              <p className="feature-text">
                Alongside every page, you get a guide that calls out specific Faber-Castell pencils.
                Choose your set size. We match colors for skin, sky, stone, and foliage
                <strong style={{ color: "var(--color-accent-clay)" }}>
                  {" "}
                  so you’re never guessing at tones.
                </strong>
              </p>
            </div>

            <div className="feature-block">
              <h4 className="feature-title">3. Layouts designed for mindful adults</h4>
              <div className="art-mock">
                <div className="art-frame">Mock preview: thoughtful whitespace &amp; line weight</div>
              </div>
              <p className="feature-text">
                Pages are detailed but breathable. Thoughtful white space. Balanced line weight. Enough
                intricacy to keep your mind engaged without turning the page into visual noise.
              </p>
            </div>

            <div className="feature-block">
              <h4 className="feature-title">4. Book-ready files you control</h4>
              <div className="art-mock">
                <div className="art-frame">Mock preview: download button &amp; PDF icon</div>
              </div>
              <p className="feature-text">
                Your free trial page arrives as a high-resolution PDF. Standard letter/A4. Print at
                home on heavier paper or walk into any office supply store and ask them to bind it. No
                shipping. No waiting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section--white">
        <div className="container">
          <div className="faq-heading">
            <h2 className="section-heading">
              Questions before you trust us with your favorite photos
            </h2>
            <h3 className="faq-subtitle">Fair. Here are straight answers.</h3>
          </div>

          <div className="faq-list">
            <div className="faq-item">
              <h4 className="faq-question">Q1: Will the line art really look like my photo?</h4>
              <p className="faq-answer">
                A: Yes. The model is trained to preserve faces and key details, not blur them. You’ll
                see a preview based on your actual photo before you download.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Q2: Is this going to feel childish?</h4>
              <p className="faq-answer">
                A: No. There are no cartoon characters or clip-art backgrounds. The pages are designed
                for adults who like detail, subtle shading, and slower work with real pencils.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Q3: I’m not an artist. Is this too advanced?</h4>
              <p className="faq-answer">
                A: If you can color inside a line, you’re fine. Each page includes practical tips and
                specific pencil suggestions.
                <strong style={{ color: "var(--color-cta-primary)" }}>
                  {" "}
                  Follow our guidance exactly, or use it as a starting point.
                </strong>
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Q4: What happens to my photos?</h4>
              <p className="faq-answer">
                A: Your images are encrypted in transit and used only to generate your art and tips. We
                don’t sell your data, and you can ask us to delete your photos and files at any time.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Q5: How do I print and bind my pages?</h4>
              <p className="faq-answer">
                A: Your file is ready for standard letter/A4. Print on heavier paper at home or email
                it to a local print/office shop and ask for simple spiral or comb binding. Most places
                can do it in a day.
              </p>
            </div>

            <div className="faq-item">
              <h4 className="faq-question">Q6: What exactly do I get in the free trial?</h4>
              <p className="faq-answer">A: You get three pages built from one photo:</p>
              <ul
                style={{
                  margin: "0.5rem 0 0 1.25rem",
                  padding: 0,
                  fontSize: "0.9rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <li>The original photo</li>
                <li>The detailed line art</li>
                <li>A companion tips page with Faber-Castell suggestions</li>
              </ul>
              <p className="faq-answer" style={{ marginTop: "0.5rem" }}>
                No credit card.{" "}
                <strong style={{ color: "var(--color-cta-primary)" }}>
                  They are yours to keep, even if you never upgrade.
                </strong>
              </p>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#hero-form" className="btn-primary">
              Create my free coloring page
            </a>
            <p className="inline-cta-meta">Start with one photo that still makes you pause.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section section--final">
        <div className="container">
          <div className="final-heading">
            <h2 className="section-heading">
              Your photos are piling up. Turn one into something you can hold.
            </h2>
            <h3 className="final-subtitle">
              Take one memory off the screen and onto your table tonight.
            </h3>
          </div>

          <div className="final-grid">
            <div className="final-grid-item">
              <p className="final-grid-item-title">Personal</p>
              <p>Built from your own photos, not stock images.</p>
            </div>
            <div className="final-grid-item">
              <p className="final-grid-item-title">Thoughtful</p>
              <p>Designed for colored pencils, quiet time, and real focus.</p>
            </div>
            <div className="final-grid-item">
              <p className="final-grid-item-title">Fast</p>
              <p>One free page in minutes, ready to print and color.</p>
            </div>
          </div>

          <div className="inline-cta">
            <a href="#hero-form" className="btn-primary">
              Turn my photo into a free page
            </a>
            <p className="inline-cta-meta">
              If you’re done coloring generic designs, start with a single photo that still makes you
              feel something.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <nav className="footer-nav">
            <a href="#about">About</a>
            <span>|</span>
            <a href="#how-it-works">How it works</a>
            <span>|</span>
            <a href="#privacy">Privacy</a>
            <span>|</span>
            <a href="#terms">Terms</a>
            <span>|</span>
            <a href="#contact">Contact</a>
          </nav>
          <p className="footer-note">
            PhotoLineArt uses AI to help create line art and color guides from your photos. We treat
            your images and personal data with care. See our Privacy Policy for the details.
          </p>
        </div>
      </footer>
    </div>
  );
}
