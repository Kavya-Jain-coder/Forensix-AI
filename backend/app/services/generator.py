import os
import json
import re
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

load_dotenv()

class ReportGenerator:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        print(f"[INFO] Using Groq model: {model}")
        self.llm = ChatGroq(
            model=model,
            api_key=api_key,
            temperature=0.2,
            max_tokens=4000,
        )

    async def generate(self, full_text: str, filenames: list[str] = None, case_meta: dict = None):
        meta = case_meta or {}
        officer = meta.get("officer_in_charge") or "[To Be Assigned]"
        submitted = meta.get("submitted_by") or "Forensic Submissions Unit"
        exam_date = meta.get("date_of_examination") or "[Date Not Provided]"

        exhibit_list = ""
        if filenames:
            exhibit_list = "\n".join(f"  - {fn}" for fn in filenames)

        prompt_text = f"""You are a Principal Forensic Scientist at an accredited forensic laboratory. You have been asked to produce a full, court-admissible forensic examination report based on the evidence content provided below.

SUBMITTED EXHIBIT FILES:
{exhibit_list}

CASE ADMINISTRATION:
- Officer in Charge: {officer}
- Submitted By: {submitted}
- Date of Examination: {exam_date}

FULL EVIDENCE CONTENT:
{full_text}

---

INSTRUCTIONS:
Produce an exhaustive, professional forensic laboratory report. This report may be used in criminal proceedings. Every section must be thorough, specific, and written in formal third-person scientific prose. Do NOT summarise or truncate — write the full report.

The report must follow real forensic laboratory standards:
- Reference every exhibit by a specific exhibit reference code (e.g. RJM/1, SJM/2, etc.)
- Name all individuals mentioned in the evidence by their full names
- Describe methodology in detail (e.g. STR profiling, GC-MS analysis, latent fingerprint development using aluminium powder, etc.)
- Include specific scientific observations, measurements, and comparisons
- Use formal language throughout: "It is my opinion that...", "Examination revealed...", "The results are consistent with...", "A profile was obtained from..."
- The examination_narrative must be MINIMUM 6 detailed paragraphs covering: receipt of exhibits, condition on arrival, examination methodology, findings per exhibit, cross-comparison of exhibits, and interpretation of results
- key_findings must have AT LEAST 5 entries, each with a specific exhibit reference and detailed scientific finding
- statistical_analysis must include specific probability statements or likelihood ratios where applicable
- conclusion must be 4-6 sentences taking a clear forensic opinion

Return ONLY a valid JSON object with this exact structure (no markdown, no preamble):
{{
  "report_number": "Generate a realistic lab report number e.g. FSL/2024/CR/08847",
  "classification": "OFFICIAL — FORENSIC SCIENCE LABORATORY REPORT",
  "officer_in_charge": "{officer}",
  "submitted_by": "{submitted}",
  "date_of_examination": "{exam_date}",
  "date_of_report": "Generate today's date in DD Month YYYY",
  "laboratory_reference": "Generate a realistic lab reference e.g. LAB-REF-2024-4421",
  "exhibits": [
    {{
      "exhibit_ref": "Specific code e.g. RJM/1",
      "description": "Full detailed description of the item including packaging, labelling, and physical characteristics",
      "condition_on_receipt": "Detailed condition — sealed/unsealed, intact, degraded, contaminated etc.",
      "examination_type": "Type of forensic examination performed e.g. DNA profiling, fingerprint analysis, toxicological screening"
    }}
  ],
  "background": "3-4 sentences. Describe the nature of the case, the individuals involved (using their full names from the evidence), the circumstances that led to the submission of exhibits, and the questions the forensic examination is intended to answer.",
  "scope_of_examination": "2-3 sentences describing what specific forensic questions this examination addresses and what the examiner was asked to determine.",
  "examination_narrative": "MINIMUM 6 paragraphs of detailed forensic prose. Paragraph 1: Receipt and condition of exhibits. Paragraph 2: Examination methodology and scientific techniques used. Paragraph 3: Findings from first exhibit(s) — specific, detailed. Paragraph 4: Findings from subsequent exhibit(s) — specific, detailed. Paragraph 5: Cross-comparison and correlation of findings across exhibits. Paragraph 6: Scientific interpretation of all findings in context of the case. Use real forensic language throughout. Each paragraph must be at least 5 sentences.",
  "key_findings": [
    {{
      "finding_number": 1,
      "exhibit_ref": "Specific exhibit reference",
      "finding": "Detailed scientific finding in formal language — at least 3 sentences describing what was found, how it was found, and what it means",
      "significance": "critical|high|medium|low",
      "evidential_value": "Explanation of the evidential value of this finding in the context of the case"
    }}
  ],
  "statistical_analysis": "Detailed statistical interpretation. Include likelihood ratios, match probabilities, or frequency statistics where applicable. For DNA: state the probability of a random match in the relevant population. For other evidence types: state the statistical basis for any conclusions. Minimum 3 sentences.",
  "conclusion": "4-6 sentences. State clearly what the forensic evidence supports or does not support. Use formal opinion language. Reference specific exhibits and findings. State the strength of the forensic evidence. End with the examiner's professional opinion.",
  "risk_level": "critical|high|medium|low",
  "recommendations": [
    "Specific, actionable forensic recommendation with justification",
    "Second specific recommendation",
    "Third specific recommendation if warranted"
  ],
  "limitations": "Any limitations of the examination — degraded samples, insufficient material, environmental contamination, methodological constraints etc.",
  "examiner_statement": "I have examined the items listed in this report and the results of my examination are set out above. The opinions expressed are my own professional opinions based on the evidence examined. I understand my duty is to the court and I have complied with that duty. I confirm that the facts stated in this report are true and the opinions expressed are my genuine professional opinions.",
  "confidence_note": "Assessment of overall confidence in the findings and any caveats that should be considered when interpreting this report."
}}

ABSOLUTE REQUIREMENTS — failure to meet these will make the report inadmissible:
1. officer_in_charge = exactly "{officer}", submitted_by = exactly "{submitted}", date_of_examination = exactly "{exam_date}"
2. examination_narrative MUST be at least 6 full paragraphs — do not truncate
3. key_findings MUST have at least 5 entries
4. Every exhibit in the evidence MUST appear in the exhibits array with a proper reference code
5. Use the actual names, locations, substances, and details from the evidence — never use placeholders
6. Return ONLY the JSON object"""

        response = await self.llm.ainvoke([HumanMessage(content=prompt_text)])
        result = self._parse_json_response(response.content)
        print(f"[INFO] Report generated successfully")
        return result

    async def generate_from_images(self, image_paths: list[str], mime_types: list[str], filenames: list[str], case_meta: dict = None):
        exhibits_desc = "\n".join(
            f"  Exhibit {i+1}: {filenames[i]} — File type: {mime_types[i]}, Size: visual evidence"
            for i in range(len(filenames))
        )

        full_text = f"""Visual forensic evidence submitted for laboratory examination.

Submitted Exhibits:
{exhibits_desc}

Examination Note:
These exhibits consist of image-based forensic evidence. Automated OCR text extraction did not yield readable text content, indicating the exhibits are photographic or graphical in nature rather than document-based. Each image exhibit requires detailed visual forensic examination including analysis of physical characteristics visible in the image, any identifiable markings, damage patterns, trace evidence, or other forensically relevant features that can be observed and documented.

The examiner should treat each image as a physical exhibit and document all observable forensic features in accordance with standard laboratory procedures."""

        return await self.generate(full_text, filenames, case_meta)

    def _parse_json_response(self, content):
        raw = self._response_text(content)
        raw = raw.replace('```json', '').replace('```', '').strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError as e:
                    raise ValueError(f"LLM response is not valid JSON: {e}")
            raise ValueError(f"No JSON found in LLM response: {raw[:300]}")

    @staticmethod
    def _response_text(content) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict) and "text" in item:
                    parts.append(item["text"])
            return "\n".join(parts)
        return str(content)
