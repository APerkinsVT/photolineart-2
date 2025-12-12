import { useState } from 'react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, reason, message }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Request failed');
      }
      setStatus('success');
      setName('');
      setEmail('');
      setReason('');
      setMessage('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Sorry, we could not send your message right now. Please try again.');
    }
  };

  return (
    <div className="page">
      <section className="section section--white">
        <div className="container" style={{ maxWidth: '720px' }}>
          <h1 className="section-heading" style={{ marginBottom: '0.5rem' }}>
            Contact
          </h1>
          <p className="problem-subtitle" style={{ marginBottom: '1rem' }}>
            Have a question, suggestion, or problem with a coloring page? I’d love to hear from you.
          </p>
          <p className="faq-answer" style={{ marginBottom: '1rem' }}>
            The easiest way to get in touch is by using this form. I usually reply within 1–2 business days.
          </p>
          <p className="faq-answer" style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Things you can contact me about:</p>
          <ul style={{ marginTop: 0, marginBottom: '1.25rem', paddingLeft: '1.25rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <li>Trouble uploading photos or downloading your pages</li>
            <li>Questions about print quality or binding</li>
            <li>Ideas for new features or improvements</li>
            <li>Bug reports (screenshots are very welcome!)</li>
            <li>Other — anything else related to PhotoLineArt</li>
          </ul>
          <p className="faq-answer" style={{ marginBottom: '1.25rem' }}>
            If your question is about a specific coloring page or book, please include:
            <br />
            • The email address you used on the site
            <br />
            • Roughly when you used it (date/time)
            <br />
            • A brief description of what happened
            <br />
            That helps me track things down much faster.
          </p>
          <p className="faq-answer" style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Thanks for trying PhotoLineArt and helping me make it better. — Andy</p>

          <form
            onSubmit={handleSubmit}
            style={{
              background: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 14px 30px rgba(0,0,0,0.06)',
              display: 'grid',
              gap: '1rem',
            }}
          >
            <div>
              <label style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.75rem',
                  fontSize: '1rem',
                }}
                placeholder="Your name"
              />
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>Email (required)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.75rem',
                  fontSize: '1rem',
                }}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.75rem',
                  fontSize: '1rem',
                }}
              >
                <option value="">Choose one</option>
                <option value="question">Question</option>
                <option value="bug">Bug / issue</option>
                <option value="feature">Feature request</option>
                <option value="print">Printing / binding</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '140px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                }}
                placeholder="How can we help?"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                className="btn-primary"
                disabled={status === 'submitting'}
                style={{ opacity: status === 'submitting' ? 0.6 : 1 }}
              >
                {status === 'submitting' ? 'Sending…' : 'Send message'}
              </button>
              {status === 'success' && (
                <p style={{ color: 'var(--color-cta-primary)', marginTop: '0.5rem', fontWeight: 600 }}>Thanks—message sent!</p>
              )}
              {status === 'error' && (
                <p style={{ color: 'var(--color-accent-clay)', marginTop: '0.5rem', fontWeight: 600 }}>{error}</p>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
