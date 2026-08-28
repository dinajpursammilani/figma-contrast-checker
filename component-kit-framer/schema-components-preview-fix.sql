-- The seed previews hardcoded colors like #1a1a1c/#b8b8bc for "text" bars. That's fine in
-- light mode but nearly invisible against this app's dark theme (its own dark grays are close
-- to those same values) — most cards looked broken/empty as a result. Switching to the same
-- CSS variables the borders already used (var(--text), var(--text-muted), var(--accent)) makes
-- every preview adapt to whichever theme the viewer has selected.

update components set preview_svg = '<svg viewBox="0 0 200 84"><rect width="200" height="84" fill="none"/>
      <rect x="70" y="14" width="60" height="4" rx="2" fill="var(--accent)"/>
      <rect x="40" y="26" width="120" height="8" rx="2" fill="var(--text)"/>
      <rect x="55" y="40" width="90" height="6" rx="2" fill="var(--text-muted)"/>
      <rect x="75" y="56" width="50" height="16" rx="8" fill="var(--accent)"/>
    </svg>'
where id = 'hero';

update components set preview_svg = '<svg viewBox="0 0 200 84"><rect x="10" y="30" width="180" height="24" rx="6" fill="none" stroke="var(--border)"/>
      <rect x="20" y="38" width="30" height="8" rx="2" fill="var(--text)"/>
      <rect x="80" y="40" width="20" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="108" y="40" width="20" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="150" y="37" width="30" height="10" rx="5" fill="var(--accent)"/>
    </svg>'
where id = 'navbar';

update components set preview_svg = '<svg viewBox="0 0 200 84"><rect x="60" y="6" width="80" height="72" rx="8" fill="none" stroke="var(--border)"/>
      <rect x="70" y="16" width="20" height="5" rx="2" fill="var(--accent)"/>
      <rect x="70" y="26" width="40" height="12" rx="2" fill="var(--text)"/>
      <rect x="70" y="46" width="45" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="70" y="54" width="45" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="70" y="64" width="60" height="10" rx="5" fill="var(--accent)"/>
    </svg>'
where id = 'pricing-card';

update components set preview_svg = '<svg viewBox="0 0 200 84"><rect x="30" y="8" width="140" height="68" rx="10" fill="none" stroke="var(--border)"/>
      <rect x="42" y="20" width="116" height="5" rx="2" fill="var(--text-muted)"/>
      <rect x="42" y="30" width="90" height="5" rx="2" fill="var(--text-muted)"/>
      <circle cx="52" cy="58" r="8" fill="var(--accent)" opacity="0.35"/>
      <rect x="66" y="54" width="40" height="4" rx="2" fill="var(--text)"/>
      <rect x="66" y="61" width="55" height="4" rx="2" fill="var(--text-muted)"/>
    </svg>'
where id = 'testimonial';

update components set preview_svg = '<svg viewBox="0 0 200 84"><rect x="55" y="10" width="90" height="64" rx="8" fill="none" stroke="var(--border)"/>
      <rect x="65" y="20" width="18" height="18" rx="5" fill="var(--accent)" opacity="0.35"/>
      <rect x="65" y="46" width="50" height="6" rx="2" fill="var(--text)"/>
      <rect x="65" y="56" width="65" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="65" y="63" width="55" height="4" rx="2" fill="var(--text-muted)"/>
    </svg>'
where id = 'feature-card';

-- CTA Banner's dark surface is deliberate (it's simulating an actually-dark section, not app
-- text), so it stays a fixed dark fill in both themes — just added a border so its edge doesn't
-- disappear against this app's own dark background.
update components set preview_svg = '<svg viewBox="0 0 200 84"><rect x="20" y="24" width="160" height="36" rx="8" fill="#1a1a1c" stroke="var(--border)"/>
      <rect x="32" y="35" width="60" height="6" rx="2" fill="white"/>
      <rect x="32" y="44" width="80" height="4" rx="2" fill="#8a8a90"/>
      <rect x="140" y="34" width="30" height="16" rx="8" fill="white"/>
    </svg>'
where id = 'cta-banner';

update components set preview_svg = '<svg viewBox="0 0 200 84">
      <rect x="20" y="12" width="24" height="4" rx="2" fill="var(--text)"/>
      <rect x="20" y="20" width="18" height="3" rx="1.5" fill="var(--text-muted)"/>
      <rect x="20" y="26" width="18" height="3" rx="1.5" fill="var(--text-muted)"/>
      <rect x="90" y="12" width="24" height="4" rx="2" fill="var(--text)"/>
      <rect x="90" y="20" width="18" height="3" rx="1.5" fill="var(--text-muted)"/>
      <rect x="90" y="26" width="18" height="3" rx="1.5" fill="var(--text-muted)"/>
      <rect x="160" y="12" width="20" height="4" rx="2" fill="var(--text)"/>
      <rect x="160" y="20" width="16" height="3" rx="1.5" fill="var(--text-muted)"/>
      <line x1="20" y1="48" x2="180" y2="48" stroke="var(--border)"/>
      <rect x="20" y="58" width="50" height="4" rx="2" fill="var(--text-muted)"/>
      <rect x="140" y="58" width="40" height="4" rx="2" fill="var(--text-muted)"/>
    </svg>'
where id = 'footer';

update components set preview_svg = '<svg viewBox="0 0 200 84">

        <rect x="15" y="30" width="40" height="10" rx="2" fill="var(--text)"/>
        <rect x="20" y="46" width="30" height="4" rx="2" fill="var(--text-muted)"/>

        <rect x="80" y="30" width="40" height="10" rx="2" fill="var(--text)"/>
        <rect x="85" y="46" width="30" height="4" rx="2" fill="var(--text-muted)"/>

        <rect x="145" y="30" width="40" height="10" rx="2" fill="var(--text)"/>
        <rect x="150" y="46" width="30" height="4" rx="2" fill="var(--text-muted)"/>

    </svg>'
where id = 'stats-row';
