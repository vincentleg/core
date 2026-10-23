# V9.9 crisis-resource source review — 2026-10-20

Scope: public documentation checks, not clinical review, test calls, service availability monitoring or founder approval. The fixed responses were written by coding models; the previous claim that people authored them was unsupported and removed from the Explorer UI. Language does not establish a person's country. The recognizer is a limited deterministic pattern list, not a safety classifier with measured recall.

| Resource | Primary source checked | Result |
| --- | --- | --- |
| US 988 | [SAMHSA](https://www.samhsa.gov/mental-health/988) | Call/text 988 supported |
| Canada 988, emergency 911 | [9-8-8 Canada](https://988.ca/) | Call/text 988 and emergency 911 supported |
| UK/Ireland 116 123 | [Samaritans](https://www.samaritans.org/how-we-can-help/contact-samaritan/) | Free phone service supported |
| France 3114 | [3114](https://3114.fr/) | Free, 24/7 supported |
| Belgium 0800 32 123 | [Centre de Prévention du Suicide](https://www.preventionsuicide.be/) | Number supported |
| Switzerland 143 | [143 contact and costs](https://www.143.ch/hilfesuchende/hilfesuchende-kontakt/) | Number supported; carrier charges can apply. Added this qualification to FR/DE responses |
| Spain 024 | [Spanish Ministry of Health](https://www.sanidad.gob.es/linea024/home.htm) | National, free, confidential, 24/7 supported |
| Mexico 800 911 2000 | [CONASAMA](https://www.gob.mx/conasama/articulos/linea-de-la-vida-800-911-2000) | Official indexed page supports number and free 24/7 service; direct gob.mx fetch returned 403 |
| Germany 0800 111 0 111 / 0800 111 0 222 | [TelefonSeelsorge](https://www.telefonseelsorge.de/telefon/) | Numbers/free service supported |
| Austria 142 | [TelefonSeelsorge Austria](https://www.telefonseelsorge.at/a) | Official indexed page supports free confidential 24/7 service; homepage fetch timed out |
| Mainland China 12356 | [National Health Commission notice, Chinese government](https://www.gov.cn/zhengce/zhengceku/202412/content_6994470.htm) | National psychological assistance number supported |
| Brazil 188 | [CVV](https://cvv.org.br/o-cvv/) | National free service supported |
| Portugal 1411 | [Portuguese government, 2025-09-10](https://portugal.gov.pt/pt/gc25/comunicacao/noticias/nova-linha-de-prevencao-do-suicidio-entra-em-funcionamento) | Dedicated suicide-prevention service established; replaced the general SNS24 number in the PT response |

Emergency references additionally checked: [EU 112](https://digital-strategy.ec.europa.eu/en/policies/112), [UK 999/112](https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers), [France 15/112](https://www.service-public.gouv.fr/particuliers/vosdroits/F33954), [Brazil 190/192](https://www.gov.br/mcom/pt-br/noticias/noticias_alt/2026/setembro/emergencia-voce-sabe-para-quem-ligar-quando-precisa-de-ajuda), [Beijing government 110/120 guide](https://wb.beijing.gov.cn/en/policy_release/others_1/202408/P020240821604219730939.pdf). German/Chinese emergency wording now explicitly scopes regional numbers and asks for the local emergency number. US/Mexico emergency-number details and availability are not independently retested here.

Remaining: founder/qualified human review of every response and translation, geographic suitability, and ongoing confirmation of service availability. None of these services was called. A verified phone number does not validate the recognizer or guarantee that a call connects.

Regression evidence: `test/core-intelligence.test.js` covers six-language interception, no model/navigation, ordinary map-query counterexamples, Portugal 1411, and absence of the user's crisis text from saved/exportable dialogue state. `test/intelligence-server.test.js` covers direct bridge interception with zero model calls.

## Phase 2 supplement — 2026-10-21

The remaining US emergency-number reference is supported by the [US National 911 Program](https://www.911.gov/calling-911/). Mexico’s national emergency number is supported by the [Secretaría de Gobernación](https://www.gob.mx/segob/articulos/que-es-9-1-1) and its [current national statistics record](https://www.gob.mx/911/documentos/estadistica-nacional-del-numero-de-atencion-de-llamadas-de-emergencia-9-1-1-111029?idiom=es). These are public primary-source checks, not test calls or live availability guarantees. Phase 1 service-specific reviews are retained rather than represented as repeated checks. Human geographic/clinical and translation sign-off remains absent.

Additional crisis bypasses were found in World research investigations, Team Dialogue and optional contribution structuring. Guards now execute before model probing/calls and before saving the question; the shared investigation/contribution model functions also reject direct crisis calls. Unit regressions cover all six languages with zero generated calls/recorded steps. Browser regressions cover World research/contribution forms, the direct research client and Team Dialogue at both viewport sizes in all six languages; fixed resources appear, inputs clear and original questions are absent from localStorage. This broadens the original three-surface audit scope; it is still not a detector-recall or clinical evaluation.
