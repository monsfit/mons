import { ThemeToggle } from './ThemeToggle'
import { dailyMeals, principles, productPillars } from '../content'

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </svg>
  )
}

function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Mons daily nutrition dashboard preview">
      <div className="preview-glow" />
      <div className="phone-shell">
        <div className="phone-status" aria-hidden="true">
          <span>9:41</span>
          <span className="dynamic-island" />
          <span>●●●</span>
        </div>
        <div className="phone-header">
          <span className="mini-mark">MONS</span>
          <button type="button" aria-label="Open account notifications">
            <span aria-hidden="true">○</span>
          </button>
        </div>
        <p className="phone-kicker">Tuesday, August 5</p>
        <h2>Good morning.</h2>
        <section className="daily-card">
          <div className="daily-card-heading">
            <div>
              <span>Daily energy</span>
              <strong>1,342</strong>
              <small>858 kcal remaining</small>
            </div>
            <div className="energy-ring" aria-hidden="true">
              <span>61%</span>
            </div>
          </div>
          <div className="macro-grid">
            <div>
              <span>P</span>
              <strong>85 / 138g</strong>
            </div>
            <div>
              <span>F</span>
              <strong>41 / 73g</strong>
            </div>
            <div>
              <span>C</span>
              <strong>126 / 248g</strong>
            </div>
          </div>
        </section>
        <div className="timeline-heading">
          <h3>Today</h3>
          <span>2 meals</span>
        </div>
        <div className="meal-stack">
          {dailyMeals.map((meal) => (
            <div className="meal-row" key={meal.time}>
              <time>{meal.time}</time>
              <div>
                <strong>{meal.name}</strong>
                <span>
                  {meal.calories} kcal · {meal.macros}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="phone-search">
          <span aria-hidden="true">⌕</span>
          <span>Search for a food</span>
          <strong aria-hidden="true">⌗</strong>
        </div>
      </div>
    </div>
  )
}

export function MarketingPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand-mark" href="#top" aria-label="Mons home">
          MONS
        </a>
        <nav aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#approach">Approach</a>
          <a href="/foods">Food data</a>
          <a className="nav-cta" href="#early-access">
            Early access
          </a>
        </nav>
        <ThemeToggle />
      </header>

      <main id="main">
        <section className="hero" id="top">
          <div className="hero-copy">
            <div className="eyebrow">
              <SparkIcon /> Built for the whole practice
            </div>
            <h1>
              Nutrition and training, <em>in rhythm.</em>
            </h1>
            <p>
              Mons brings food, strength training, and weight progress into one focused daily
              practice—so you can act on the signal and leave the noise behind.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#early-access">
                Get early access <ArrowIcon />
              </a>
              <a className="button button-secondary" href="#product">
                Explore Mons
              </a>
            </div>
            <div className="hero-proof" aria-label="Product principles">
              <span>Private by design</span>
              <span>Evidence-led targets</span>
              <span>Built for iPhone</span>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section className="manifesto" aria-label="Mons philosophy">
          <p>One body. One day. One clear view.</p>
          <span>Food, training, and progress finally speak the same language.</span>
        </section>

        <section className="product-section" id="product">
          <div className="section-heading">
            <span>One focused system</span>
            <h2>
              Everything you need.
              <br />
              Nothing competing for attention.
            </h2>
          </div>
          <div className="pillar-grid">
            {productPillars.map((pillar, index) => (
              <article className="pillar-card" key={pillar.id}>
                <div className="pillar-number">0{index + 1}</div>
                <span className="pillar-eyebrow">{pillar.eyebrow}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
                <div className="pillar-metric">
                  <strong>{pillar.metric}</strong>
                  <span>{pillar.metricLabel}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="approach-section" id="approach">
          <div className="approach-copy">
            <span className="section-label">A calmer feedback loop</span>
            <h2>Consistency needs context, not judgment.</h2>
            <p>
              Mons is designed around the decisions you can make today while keeping the longer
              trend close enough to trust.
            </p>
          </div>
          <ol className="principle-list">
            {principles.map(([title, description], index) => (
              <li key={title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="early-access" id="early-access">
          <div>
            <span className="section-label">Coming to iPhone</span>
            <h2>
              Build the practice.
              <br />
              Keep the momentum.
            </h2>
          </div>
          <div className="early-access-action">
            <p>Be first to know when the private beta opens.</p>
            <a
              className="button button-inverse"
              href="mailto:hello@mons.fit?subject=Mons%20early%20access"
            >
              Request early access <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand-mark brand-mark-small" href="#top">
          MONS
        </a>
        <p>Nutrition and training, in rhythm.</p>
        <span>© 2026 Mons</span>
      </footer>
    </>
  )
}
