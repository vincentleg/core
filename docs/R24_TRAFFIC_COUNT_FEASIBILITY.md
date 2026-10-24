# R24 — Real traffic count feasibility (2026-10-23)

**Decision: NO-GO for a calibration experiment now.** This is source qualification only. No measurement file was downloaded, ingested, or used to fit the exploratory, uncalibrated model.

## Required observation

`src/urban/model.mjs` applies `demand / 3600` arrivals each second to **one mapped approach**. The direct observation needed for that input is a directional motor-vehicle arrival count for the same approach and time window, expressed as vehicles/hour (ideally approach and turning-movement counts in 15-minute bins across comparable days). The model also assumes lane count, saturation flow, green fraction, cycle, duration, and speed; volume alone cannot calibrate those assumptions or validate its delay and queue outputs.

## Official candidates (three reviewed)

| Candidate and publisher | Space, time, units, actual observations | Reuse status |
|---|---|---|
| [Howard Street traffic volume report, Location 6](https://www.sfmta.com/media/27438/download?inline=), SFMTA publication of a Quality Counts, LLC tube survey; listed in the [SFMTA RAISE repository](https://www.sfmta.com/reports/san-francisco-municipal-transportation-agency-howard-streetscape-improvement-project%C2%A0usdot-2021-raise-grant-data-repository) | Howard between 6th and 7th, westbound; **17 October 2018 only**. The previously qualified source manifest records actual hourly vehicle-volume observations in a 24-hour report, not a multi-day series. | **Unverified**: no dataset-specific grant or vendor reuse terms established. [SFMTA site terms](https://www.sfmta.com/terms-of-use) explain CSV access and reserve rights in editorial/creative assets; they do not grant reuse of these measurements. |
| [Corridor Counts 2014–2022](https://www.sfmta.com/TrafficCounts), SFMTA CSV ([file link, not opened for this review](https://www.sfmta.com/media/40635/download?inline=)) | Citywide sampled street blocks, row-level dates; prior metadata inspection found Folsom Beale–Main (CNN 5652000), 13–14 December 2017, **outside** CORE's 2nd–11th Folsom geometry. Contains `VOLUME_ADT`, `VOLUME_AM_PEAK`, `VOLUME_PM_PEAK`; whether peak fields are measured hourly counts and how ADT was derived remain unverified. | **Unverified**: no CSV-specific reuse grant found. |
| [Intersection Counts 2014–2022](https://www.sfmta.com/TrafficCounts), SFMTA CSV ([file link, not opened for this review](https://www.sfmta.com/media/40634/download?inline=)) | Citywide sampled intersections; prior metadata lists Howard/6th and Howard/7th on isolated 2015–2016 dates. Actual count records exist, but approach direction, units, and measurement method have not been qualified for model input. | **Unverified**: no CSV-specific reuse grant found. |

The candidate details above come from existing `docs/pilot/source-manifest.json`; this review checked only official catalog, repository, rights, and project pages. DataSF's authorized street centerlines are geometry, not traffic measurements (`data/urban/catalog.json`, `docs/DATA_SOURCES.md`).

## Best match and remaining evidence

The Howard Location 6 hourly westbound count is closest to the model's vehicles/hour demand. Its 6th–7th block crosses CORE centerline segments `7043000`–`7046000`; the solver runs **one** segment at a time and has no turning flows or block-wide aggregation rule. The count location must be matched to a specific upstream approach before use. The [SFMTA project page](https://www.sfmta.com/projects/folsom-howard-streetscape-project) records near-term Howard changes installed in winter 2019, a planned road diet, new signal phases, and 2026–2029 construction, so the 2018 count must not represent present-day conditions. A historical experiment would require matching 2018 lanes and signal timing; a current experiment would require new post-change counts. Neither has a documented independent holdout or observed queue/delay data.

**To reconsider:** obtain explicit publisher and vendor authorization for access, analysis, and any intended publication; confirm the count location, units, class coverage, and method; choose a historical or post-construction epoch; obtain same-epoch approach counts on multiple comparable days, lane and signal records, an independent holdout, and independent review. Until then, do not retrieve or process the count files and do not claim calibration or predictive accuracy.
