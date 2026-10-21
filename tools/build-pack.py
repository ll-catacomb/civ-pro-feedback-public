#!/usr/bin/env python3
"""Bundle content/ into a handful of upload-friendly files in pack/.

Desktop apps (Claude Projects, ChatGPT Projects, Gemini Gems, ...) cap how many
files you can attach, so the ~400 course files are merged into ~10 bundles.
Each original file stays findable under a `# SOURCE: <path>` heading.

Run after adding or editing anything in content/:  python3 tools/build-pack.py
The hand-written pack files (00-INSTRUCTIONS.md, 01-chain.md,
02-course-conventions.md) are not touched.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COURSE = ROOT / "content" / "course"
PACK = ROOT / "pack"


def read(path: Path) -> tuple[str, str]:
    """(title, body) with YAML frontmatter stripped."""
    raw = path.read_text(encoding="utf-8")
    title = path.stem.replace("-", " ")
    m = re.match(r"^---\n(.*?)\n---\n?", raw, re.S)
    if m:
        t = re.search(r'^title:\s*"?(.*?)"?\s*$', m.group(1), re.M)
        if t:
            title = t.group(1)
        raw = raw[m.end():]
    return title, raw.strip()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def write(name: str, header: str, sections: list[str]) -> None:
    out = PACK / name
    out.write_text(header.strip() + "\n\n" + "\n\n".join(sections) + "\n", encoding="utf-8")
    print(f"{name:42} {out.stat().st_size // 1024:6} KB  {len(sections)} sections")


# ---- exams: pair each paper with its instructor model answer ----------------
CLEANED = re.compile(r"^(\d{4})-final\.md$")
RAW = re.compile(r"^(\d{4})-greiner-civpro[^-]*-final(-alt)?\.md$")
MODEL = re.compile(r"^(\d{4})-greiner-civpro[^-]*-model-answer\.md$")
VARIANT = re.compile(r"^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)-final\.md$")
VARIANT_MODEL = re.compile(r"^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)-model-answer\.md$")


def exams() -> list[tuple[str, int, Path, Path]]:
    found: dict[str, dict] = {}
    for f in sorted((COURSE / "exams").glob("*.md")):
        n = f.name
        if m := CLEANED.match(n):
            found.setdefault(f"{m[1]}-final", {"year": int(m[1])})["prompt"] = f
        elif m := RAW.match(n):
            found.setdefault(f"{m[1]}-final", {"year": int(m[1])}).setdefault("raw", f)
        elif m := MODEL.match(n):
            found.setdefault(f"{m[1]}-final", {"year": int(m[1])})["model"] = f
        elif m := VARIANT.match(n):
            found.setdefault(f"{m[1]}-{m[2]}-final", {"year": int(m[1])})["prompt"] = f
        elif m := VARIANT_MODEL.match(n):
            found.setdefault(f"{m[1]}-{m[2]}-final", {"year": int(m[1])})["model"] = f
    items = []
    for exam_id, e in found.items():
        prompt = e.get("prompt") or e.get("raw")
        if prompt and e.get("model"):
            items.append((exam_id, e["year"], prompt, e["model"]))
    return sorted(items)


def exam_section(exam_id: str, prompt: Path, model: Path) -> str:
    title, body = read(prompt)
    _, answer = read(model)
    return (f"# EXAM {exam_id} — {title}\n\nSource: {rel(prompt)} · model answer: {rel(model)}\n\n"
            f"## {exam_id} · Exam text\n\n{body}\n\n## {exam_id} · Instructor model answer\n\n{answer}")


# ---- assignments: prompt + every circulated exemplary answer -----------------
A_PROMPT = re.compile(r"^(\d{4})-assignment-(\d{2})\.md$")
A_MODEL = re.compile(r"^(\d{4})-assignment-(\d{2})-(?:.+-)?model-answer(?:[-.].*)?\.md$")


def assignments() -> list[tuple[str, int, Path, list[Path]]]:
    prompts, models = {}, {}
    for f in sorted((COURSE / "assignments").glob("*.md")):
        if m := A_PROMPT.match(f.name):
            prompts[f"{m[1]}-assignment-{m[2]}"] = f
        elif m := A_MODEL.match(f.name):
            models.setdefault(f"{m[1]}-assignment-{m[2]}", []).append(f)
    return [(k, int(k[:4]), p, models[k]) for k, p in sorted(prompts.items()) if models.get(k)]


def assignment_section(item_id: str, prompt: Path, exemplars: list[Path]) -> str:
    title, body = read(prompt)
    parts = [f"# ASSIGNMENT {item_id} — {title}\n\nSource: {rel(prompt)}\n\n## {item_id} · Assignment prompt\n\n{body}"]
    for i, f in enumerate(exemplars, 1):
        _, text = read(f)
        parts.append(f"## {item_id} · Exemplary student answer {i}\n\n"
                     f"*Past student exemplar ({rel(f)}): circulated by the instructor as among the best in the class. "
                     f"May inform writing and organization; never doctrinal authority, never cited to a student.*\n\n{text}")
    return "\n\n".join(parts)


def source_sections(folders: list[str]) -> list[str]:
    out = []
    for folder in folders:
        for f in sorted((COURSE / folder).glob("*.md")):
            title, body = read(f)
            out.append(f"# SOURCE: {rel(f)} — {title}\n\n{body}")
    return out


def main() -> None:
    PACK.mkdir(exist_ok=True)
    for old in PACK.glob("1*.md"):
        old.unlink()
    for old in PACK.glob("2*.md"):
        if old.name != "02-course-conventions.md":
            old.unlink()

    ex = exams()
    exam_note = ("Past finals paired with Professor Greiner's model answers. Look an exam up by its ID heading, e.g. "
                 "`# EXAM 2019-final`. These are given to the chain directly; they are NOT searched as course sources.")
    write("10-exams-2007-2016.md", f"# Exams 2007–2016\n\n{exam_note}",
          [exam_section(i, p, m) for i, y, p, m in ex if y <= 2016])
    write("11-exams-2017-2025.md", f"# Exams 2017–2025\n\n{exam_note}",
          [exam_section(i, p, m) for i, y, p, m in ex if y >= 2017])

    asg = assignments()
    asg_note = ("Short graded assignments (one question, ~850 words). Each is practicable on its own: its exemplary answers "
                "take the place of an instructor model answer. Look one up by `# ASSIGNMENT <id>`.")
    write("12-assignments-2007-2015.md", f"# Assignments 2007–2015\n\n{asg_note}",
          [assignment_section(i, p, e) for i, y, p, e in asg if y <= 2015])
    write("13-assignments-2016-2025.md", f"# Assignments 2016–2025\n\n{asg_note}",
          [assignment_section(i, p, e) for i, y, p, e in asg if y >= 2016])

    src_note = "Citable course material for the retrieval stages. Each file starts at a `# SOURCE: <path>` heading."
    casebook = source_sections(["casebook"])
    half = len(casebook) // 2
    write("20-casebook-part-1.md", f"# Casebook (part 1)\n\n{src_note}", casebook[:half])
    write("21-casebook-part-2.md", f"# Casebook (part 2)\n\n{src_note}", casebook[half:])
    write("22-lectures-and-study-aids.md", f"# Class summaries and review sessions\n\n{src_note}",
          source_sections(["lectures-videos", "study-aids"]))
    write("23-slides-primers-rules.md", f"# Slides, primers, rules and statutes\n\n{src_note}",
          source_sections(["slides-(pictures)", "primers", "rules-statutes-constitution"]))

    index = ["# Exam and assignment IDs", "",
             "Every practicable item. Finals use the instructor model answer as their benchmark; assignments use "
             "circulated exemplary student answers.", "", "| ID | Kind | File |", "|---|---|---|"]
    index += [f"| `{i}` | final | {'10' if y <= 2016 else '11'}-exams-… |" for i, y, _, _ in sorted(ex, key=lambda t: (-t[1], t[0]))]
    index += [f"| `{i}` | assignment | {'12' if y <= 2015 else '13'}-assignments-… |" for i, y, _, _ in sorted(asg, key=lambda t: (-t[1], t[0]))]
    (PACK / "03-exam-index.md").write_text("\n".join(index) + "\n", encoding="utf-8")
    print(f"03-exam-index.md: {len(ex)} finals, {len(asg)} assignments")


if __name__ == "__main__":
    main()
