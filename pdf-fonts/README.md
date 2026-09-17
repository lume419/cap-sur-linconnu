# Polices du PDF exporté

Polices [Noto](https://notofonts.github.io) embarquées dans les PDF (voir `lib/pdf-text.js`), sous licence
**SIL Open Font License 1.1** (texte complet : `OFL.txt`). Seuls les caractères utilisés sont incorporés dans chaque PDF.

Téléchargées le 17 septembre 2026, sans modification :

| Fichiers | Écritures | Source |
| --- | --- | --- |
| `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf` | latin, grec, cyrillique | notofonts/notofonts.github.io, `fonts/NotoSans/hinted/ttf/` |
| `NotoSansArabic`, `NotoSansHebrew`, `NotoSansThaana` | arabe (arabe, persan, ourdou, kurde sorani), hébreu, thâna (divehi) | idem, `fonts/<famille>/hinted/ttf/` |
| `NotoSansDevanagari`, `NotoSansBengali`, `NotoSansTamil`, `NotoSansMalayalam`, `NotoSansSinhala` | devanagari (hindi, marathi, népalais), bengali, tamoul, malayalam, cingalais | idem |
| `NotoSansThai`, `NotoSansLao`, `NotoSansKhmer`, `NotoSansMyanmar` | thaï, lao, khmer, birman | idem |
| `NotoSansGeorgian`, `NotoSansArmenian`, `NotoSansEthiopic`, `NotoSerifTibetan`, `NotoSansYi` | géorgien, arménien, éthiopien (amharique, tigrigna), tibétain (dzongkha), yi | idem (le tibétain n'existe qu'en « Serif ») |
| `NotoSansJP-Regular.otf`, `NotoSansSC-Regular.otf`, `NotoSansTC-Regular.otf`, `NotoSansKR-Regular.otf` | japonais, chinois simplifié, chinois traditionnel (et hakka), coréen | notofonts/noto-cjk, `Sans/SubsetOTF/<région>/` |

Copyright des polices : © Google LLC et les auteurs du projet Noto ; Noto Sans CJK © Adobe (« Source Han Sans »).
Ces fichiers ne sont jamais servis au navigateur (règle `pdf-fonts` du bloc `.htaccess-security-block.txt`). À ne pas
confondre avec `public/fonts/`, servi au navigateur à l'adresse `/fonts/` pour l'affichage du site (tifinagh, éthiopien,
tibétain, thâna, yi).
