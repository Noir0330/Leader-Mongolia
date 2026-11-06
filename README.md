# Prince Royal invitation landing

Backendгүй, нэг хуудастай Монгол digital invitation landing. Сонгосон `prince-royal` demo-ийн envelope animation, scroll reveal болон music interaction-ийг local static asset-аар ажиллуулна.

Leaders Mongolia light logo болон кирилл дэмждэг Cormorant Garamond, Marck Script, Manrope font-уудыг repo дотроос self-host хийнэ.

## Local preview

```bash
pnpm dev
```

Дараа нь <http://127.0.0.1:4173> нээнэ.

## Validation

```bash
pnpm check
```

## Vercel

Repo-г Vercel-д import хийгээд Framework Preset-ийг `Other` байлгана. Build command болон output directory шаардлагагүй; root `index.html` шууд serve хийгдэнэ.

## Content update

Урилгын текст, 2026 оны 12 сарын 26-ны countdown, Galaxy Event Hall байршил болон хөтөлбөрийг `index.html` дотроос шинэчилнэ. Тасалбарын мэдээлэл `tickets/index.html`, үдшийн зоогийн цэс `menu/index.html` дотор байрлана.
