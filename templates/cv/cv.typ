// CV layout; content comes from content/cv/cv.yaml (built by `make cv`).

#let data = yaml(sys.inputs.at("data", default: "/content/cv/cv.yaml"))
#let strict = sys.inputs.at("strict", default: "false") == "true"

#let accent = rgb("#1f3a68")
#let muted = rgb("#5a5f6a")
#let rule-color = rgb("#c9cfd9")

#set document(title: data.person.name + " – CV", author: data.person.name)
#set page(paper: "a4", margin: (x: 1.5cm, y: 1.3cm))
#set text(font: ("Noto Sans", "Liberation Sans", "DejaVu Sans"), size: 9.4pt, lang: "fr", fill: rgb("#1c1c1e"))
#set par(leading: 0.93em, spacing: 1.125em, justify: false)
#set list(indent: 0.2em, body-indent: 0.5em, spacing: 0.75em, marker: text(fill: accent)[•])
#show link: it => it

// Strings starting with "TODO" are highlighted, or stop the build in strict mode.
#let val(s) = {
  let s = str(s)
  if s.contains("TODO") {
    assert(not strict, message: "unfilled TODO in cv.yaml: " + s)
    highlight(fill: rgb("#ffe680"), s)
  } else { s }
}

#let section(title) = {
  v(1.8em, weak: true)
  grid(
    columns: (auto, 1fr),
    column-gutter: 0.6em,
    align: horizon,
    text(fill: accent, weight: "bold", size: 9.6pt, tracking: 0.08em, upper(title)),
    line(length: 100%, stroke: 0.5pt + rule-color),
  )
  v(1.2em, weak: true)
}

#let entry(title, right, sub: none, body: none) = {
  block(breakable: false, below: 1.3em, {
    grid(
      columns: (1fr, auto),
      column-gutter: 1em,
      text(weight: "bold", title),
      text(fill: muted, size: 8.8pt, right),
    )
    if sub != none { v(0.75em, weak: true); text(fill: muted, size: 8.8pt, sub) }
    if body != none { v(0.9em, weak: true); body }
  })
}

#let bullets(items) = list(..items.map(i => val(i)))

#let person = data.person
#{
  text(size: 22pt, weight: "bold", fill: accent, person.name)
  v(1.05em, weak: true)
  text(size: 11pt, fill: muted, val(person.title))
  v(1.05em, weak: true)
  let sep = h(0.45em) + text(fill: rule-color, "|") + h(0.45em)
  let contact = (val(person.location), link("mailto:" + person.email, person.email))
  if "phone" in person { contact.push(val(person.phone)) }
  text(size: 8.8pt, contact.join(sep))
  linebreak()
  text(size: 8.8pt, fill: accent, person.links.map(l => link(l.url, l.label)).join(sep))
  v(0.6em)
  line(length: 100%, stroke: 1.2pt + accent)
}

#section("Profil")
#val(data.profile)

#section("Projets")
#{
  for p in data.projects {
    entry(
      p.name,
      val(p.at("dates", default: "")),
      sub: p.context + "  ·  " + text(fill: accent, p.tags),
      body: bullets(p.highlights),
    )
  }
  text(size: 8.8pt, fill: muted, val(data.other_projects))
}

#section("Expérience")
#for job in data.experience {
  entry(
    [#job.role #text(fill: muted, weight: "regular")[· #job.org]],
    val(job.dates),
    body: bullets(job.highlights),
  )
}

#section("Formation")
#for e in data.education {
  entry(val(e.degree), val(e.dates), sub: e.school)
}

#section("Compétences")
#grid(
  columns: (auto, 1fr),
  column-gutter: 0.8em,
  row-gutter: 0.75em,
  ..data.skills.map(s => (text(weight: "bold", s.label), val(s.items))).flatten(),
  text(weight: "bold", "Langues"), val(data.languages),
  ..if "others" in data { (text(weight: "bold", "Autres"), val(data.others)) } else { () },
)
