# Course conventions

Instructor-supplied blocks that the stage prompts in `01-chain.md` insert by name. Wherever a stage prompt says `⟦INSERT: 02-course-conventions.md › X⟧`, read section X below as if it were pasted there, verbatim.

## Shared policy

````text
You are working on formative feedback for a Civil Procedure practice exam.

Non-negotiable rules:
- Treat the supplied exam, model answer, and retrieved course materials as the closed source set.
- Do not rely on outside law or silently repair ambiguity in the source materials.
- Cite source IDs exactly as supplied. Never invent a source ID.
- The closed source set binds what you PRESCRIBE, not just what you assert. When you tell a student they should have cited a case, rule, or statute, name only authority that actually appears in the exam, the instructor model answer, or the retrieved course sources. A real authority the course did not assign is still outside the source set, and telling a student to have cited it sends them to material they were never given.
- Distinguish omission, legal-rule error, application gap, and organization problem.
- Evaluate the answer that was actually written, not an idealized answer.
- Quote the student sparingly and exactly. If no useful quotation exists, use an empty string.
- Produce concise, auditable findings rather than hidden chain-of-thought.
- Do not reveal or infer any real student's identity.
- Never name a grader, teaching fellow, instructor, or commenter in student-facing text. Historical grader comments supplied to the chain carry their author's name as provenance for quality review; that attribution stays in the audit record. Where such a comment informs the feedback, give the substance without the source's name.
- A retrieved source labeled "past student exemplar" may silently inform writing, organization, prioritization, or compression. Never use it as doctrinal authority, never mention that exemplar to the student, and never place its source ID in a student-facing sourceIds field.
- Use ordinary words for procedural things. Write "the request for damages" rather than "the prayer", and prefer the plain phrase wherever the term of art is not itself what the course teaches.

Authoritative corrections. The course materials in the source set are dated and the law has since changed in places. The instructor-supplied corrections below control wherever a retrieved source, the instructor model answer, or the exam reflects the older position — applying them is the only sanctioned departure from the closed source set. Do not penalize a student for following current law on these points, do not credit a superseded rule as current, and do not expect or reward a topic marked as no longer part of the course:

⟦INSERT: Law changes, below⟧
````

## Law changes

````text
* Prior to 2009: Iqbal had not been decided, so the federal court system thought that it used notice pleading. After 2009, it uses plausibility pleading. 12(b)(6) and 8(a)(2) materials before 2009 are unreliable.
* Congress revised the the venue statute, section 1391, effective 2012, so materials before that date are unreliable on venue.
* In the late 2010s, I switched the way I taught Exxon. It is no longer permissible to suggest that there is an interpretation of Exxon and 1367 that may permit a single-plaintiff-multiple-defendant exercise of diversity jurisdiction in  a non-class-action-fairness-act setting.
* Public rights exception/*Atlas Roofing* is no longer part of our course
* *Reeves* is no longer part of our course. Do not cite it, do not treat it as the authority for the trial-record-only limit that distinguishes Rule 50 from Rule 56, and do not tell a student to cite it.
* Effects test for PJ
* Think I saw this in old outlines but we didn’t cover it: Citizenship of Federally Chartered Banks
````

## Greinerisms

````text
POSITIVE GREINERISMS
A “happy court” and the “Greiner Happy Court Rule”
Context: Greiner calls a court that can exercise personal jurisdiction over the defendant and in which venue is proper a “happy court.” This is relevant because of what Greiner calls the “Greiner Happy Court Rule”: if a transferor court is a happy court (has personal jurisdiction and venue is proper), then the choice of law analysis of the transferor court will follow the transfer and the transferee court will use the transferor’s choice of law analysis so that there are no major change in rules, in particular, limitations periods.
If the transferor court is a happy court: apply transferor choice of law rules
If the transferor court is an unhappy court: apply transferee choice of law rules
If a plaintiff violates forum selection clause and the case is transferred: apply transferee choice of law rules
“Incorporeal”
Context: an incorporeal object in intangible. This could be proprietary data stored in a server somewhere, for example. Greiner often tests on civil procedure problems where an incorporeal object is stolen and requires students to locate where the object “is,” which is relevant for what courts could host the lawsuit and what laws would apply. (A student may discuss: is data located in the computer where the program was made? Or in a data center that stores it in another state? Or at the headquarters of the company that made it? And then proceed on the exam from there.)
See “common abbreviations” tab
Abbreviating a lot is a Greinerism itself due to the tight word counts and the fact that Greiner does encourage and understand them! If a student is not abbreviating, he/she/they is probably doing something wrong!
Imaginary lawsuit rule
Context: A declaratory judgment is a type of lawsuit in which a party that anticipates that it would/could be a defendant in a future lawsuit acts first by seeking that a court declare what the legal rights, duties, or status of the parties are. The lawsuit that the party seeking the declaratory judgment anticipated is does not actually happen, so Greiner calls it an “imaginary lawsuit.”
A declaratory judgement only allowed in federal court if the coercive action, the “imaginary lawsuit,” could have been brought in federal court  (First Federal Savings). This is what Greiner calls the “imaginary lawsuit rule,” and other civil procedure professors call the coercive action rule.

NEGATIVE GREINERISMS
“Res judicata”
Context: we use the term claim preclusion
“Choice of law” in the context of preclusion (specifically inter-system preclusion)
Context: when one court system's judgment is given preclusive effect in another court system, the course term is intersystem preclusion. Do not describe that question as a "choice of law" question and do not paraphrase around it (for example, "what law supplies the preclusive effect of a federal judgment"). Name it intersystem preclusion. "Choice of law" is reserved for HCOL and VCOL.
“JNOV” and “judgment notwithstanding the verdict”
Context: JNOV is the superseded pre-1991 term. We use judgment as a matter of law, and the abbreviation to use is JAMOL. Where a student writes JNOV, tell them the course uses JAMOL.
“Federal question jurisdiction”
Context: we use the term arising under jurisdiction. This is the jurisdiction for federal court under 28 U.S.C 1331.
“Twiqbal”
Context: “Twiqbal” is a portmanteau of Twombly and Iqbal, the two cases that established that plausibility pleading is the federal standard. This is different from notice pleading, which was previously the federal standard. We just use the term “plausibility pleading,” not “Twiqbal.”
````

## Abbreviations

````text
In personam jurisdiction
Personal jurisdiction
IPJ
PJ
Specific in personam jurisdiction
SIPJ
SPJ
General personal jurisdiction
GPJ
Subject matter jurisdiction
SMJ
Diversity jurisdiction
DJ
Arising under jurisdiction
AUJ
Supplemental Jurisdiction
SuppJ
Non-mutual offensive collateral estoppel
NMOCE
Non-mutual defensive collateral estoppel
NMDCE
Summary judgment
SJ
Horizontal choice of law
HCOL
Vertical choice of law
VCOL
Quasi-in-rem jurisdiction
QIRJ
Forum non conveniens
FNC
Motion to dismiss
MTD
Preliminary injunction
PInj
Procedural due process
PDP
Judgment as a matter of law
JMOL
JAMOL
Federal rule of civil procedure
FRCP
Fair and reasonable
F&R
Transaction or occurrence
T/O
Lex loci delicti
LLD
Forum selection clause
FSC
Access to justice
A2J
Cause of action
COA
Principal place of business
PPOB
Amount in controversy
AIC
Common nucleus of operative facts
CNOF
Summary judgment
SJ
Case or controversy
CorC
Transaction or occurence
TO
````

## Brain-off topics

````text
* Venue
* Specific personal jurisdiction
* Claim preclusion
* Issue preclusion
* Horizontal choice of law
* Subject matter jurisdiction
  * Diversity
  * Arising under
    * Well-pleaded complaint rule is brain off, but
    * Smith-Grable follows the ordered course checklist below. Identifying the embedded and disputed federal issue is mechanical; substantiality and the discretionary factors require judgment.
* Transfer
* Removal triggers
* Interlocutory appeals checklist
````

## Course clarifications

````text
Rule 50 and finality (from Greiner, 8/2026). Rule 50 governs more than one procedural posture, and the posture decides finality:
* Denial of a PRE-VERDICT Rule 50 motion is not a final order, because the trial will continue.
* Denial of a POST-JUDGMENT Rule 50 motion is a final order for appellate jurisdiction.
Course materials that appear to disagree about whether denial of a Rule 50 motion is a final decision are describing these two different postures. Do not report this as unresolved tension in the materials, and do not credit or excuse a student's finality conclusion on the ground that the sources conflict. Identify which posture the exam presents and apply the matching rule.

Rule statements under a word limit (from Greiner, 8/2026). A full CRUPAC-style rule statement is usually too wordy for these exams. Where a student needs to establish a point, either of two forms is complete, and the choice is theirs:
* State the correct conclusion and cite the case — "The court should use State A preclusion law here, so there is no mutuality requirement in issue preclusion," citing Semtek.
* State the rule with its reasoning and skip the citation — "because the rendering court was a state court and the subsequent court is a federal court sitting in diversity, State A's preclusion law applies, so there is no mutuality requirement for issue preclusion." No Semtek citation is needed.
Never ask a student to do both, and never tell them to "state the rule" without saying which of these two forms you mean. Written-out rule statements are rarely what this exam rewards; conclusions and applications are.

Erie is the most frequently tested structure in this course and has appeared on nearly every exam. Always check whether the facts raise an Erie or vertical-choice-of-law question, including where the answer never signals one. Failing to spot a live Erie question is a severe defect on a heavily weighted question, not a secondary omission — but Erie is not mechanical. It carries real analytical work, including arguing both sides of the primary-conduct question, and must never be described as a topic to be run without judgment.

Arising-under jurisdiction under 28 U.S.C. § 1331 — use the course's ordered checklist:
1. Well-pleaded federal cause of action (Mottley). Ask whether federal law creates the cause of action and authorizes the lower federal courts to hear it. If yes, there is arising-under jurisdiction and the Smith-Grable exception is unnecessary.
2. If the cause of action arises under state law, ask whether Smith-Grable supplies jurisdictional power:
   a. Does the state-law claim contain an embedded federal issue? (Smith; Grable.)
   b. Is that issue substantial to this case — does the case turn on it, or is resolving it the only route to relief? Generalized importance, such as a broad concern about safety, is not enough. (Grable.)
   c. Is the federal issue disputed or likely to be disputed? (Grable.)
3. If those requirements are met, separately ask whether the federal court should exercise that power. Address:
   a. The federal interest at stake. (Grable.)
   b. The balance of federal and state court business, including whether accepting jurisdiction would pull a large class of ordinary state claims into federal court. (Grable; Merrell Dow; Moore.)
   c. Whether the dispute is predominantly law or fact; fact-heavy disputes weigh against using Smith-Grable.
   d. Congressional intent, including whether Congress's failure to create a federal cause of action suggests that this type of suit should remain in state court.
Do not merge the power-to-hear requirements with the discretionary factors, and do not treat substantiality as whether the federal subject is important in the abstract.

Cohen collateral-order doctrine — the risk of an avalanche of appeals is a cross-cutting policy consideration, sometimes described in the course as a shadow or stealth factor. It helps explain why appellate courts construe interlocutory review narrowly: a court is less likely to accept an interlocutory appeal when doing so would invite many similar appeals or flood the appellate system with piecemeal review. It is not a hard-and-fast element of the Cohen test. Credit a student who uses it as a reason bearing on whether the court will accept review; do not correct them for failing to present it as a formal element, and do not describe it as independently dispositive.
````

## Course formulations

````text
REA validity of a Federal Rule — the expected formulation:
A FRCP is valid under the Rules Enabling Act if it does not "abridge, enlarge or modify" a substantive right. Under Sibbach, a FRCP is valid if it "really regulates procedure." Then say whether this rule really regulates procedure.

Horizontal choice of law — say the operative sentence explicitly: procedural rules use the law of the forum state.

When the exam hands you the whole pleading, do the whole pleading analysis. A complaint reproduced in full is the strongest signal this exam gives that a full 12(b)(6) run is wanted — the drafting effort is the invitation. Expect the analysis, credit it when it appears, and treat skipping it as a major omission rather than a judgment call about emphasis.

Numerosity under Rule 23(a)(1) has a soft middle, and answers should say so. Roughly forty or more members satisfies it; roughly twenty or fewer does not; between those, it can go either way and the answer needs to argue the specific facts rather than assert a threshold. Treat a flat claim that twenty-something members guarantees numerosity as a rule error. Note also that a small amount in controversy per member supports certification rather than undermining it, since it is what makes individual suits impractical.

A policy question is answered inside this course's frame. Where a policy answer's central move sits outside civil procedure and access to justice — a discussion built on criminal law, say — that is off-topic, and the words spent there earned nothing. Name it as a distribution problem, not a doctrinal error. Access to justice is a recurring theme in these policy questions and is worth reaching for even when the prompt does not name it.

Plausibility pleading — the taught sequence, worked against the complaint paragraph by paragraph:
1. Identify the conclusory allegations by paragraph number and set them aside. A bare assertion of an element ("the cause of the drop was the defendants' decision") is conclusory however specific the surrounding paragraphs are.
2. Take the elements of the tort or claim in turn, and for each one name the paragraphs that plead facts going to it.
3. Ask whether what survives nudges each element from possible to plausible, and say which element fails if one does.
4. Where a demand rather than the claim is under attack — punitive damages, for instance — run the cut separately for that demand. A complaint can plead the claim adequately and the demand inadequately.
Feedback on a 12(b)(6) question must work at this paragraph-and-element level. "Strike the conclusory allegations" is not usable advice; "paragraph 8 asserts causation without facts, so set it aside, then ask what paragraphs 9 through 12 plead about breach" is.

What makes a strong policy or essay answer (teaching-fellow guidance, pending instructor confirmation):
1. It engages the actual question asked, rather than the topic the question sits in.
2. It makes specific references to class material, including relevant case citations, and uses the particular factors of a case rather than gesturing at its holding.
3. Where the question asks for a recommendation, it makes a concrete and creative one.
A strong policy answer is also allowed to conclude that the question has no single answer; wrestling with a genuine tension in the doctrine is an analytical move, not an evasion, and should be credited as one where the answer earns it.
````

## Grader meta-feedback

````text
* When a legal structure/algorithm exists for a topic, follow up completely
* Apply law to facts
* Avoid quotations of case law, statutes, rules or other sources of law longer than one or two words
* Cite cases and statutes when possible to reduce verboseness
* Avoid conclusory sentences.
* When the issue is close enough to so merit, explain how the facts and law might support both sides of an issue.
  * Later in the exam, you can explain what would be different if you chose differently earlier in the decision tree
````
