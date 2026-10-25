# Related work (working notes)

| Work                                                                                                                     | What it does                                                                                       | Difference from this study                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Wang (2020), _Exploiting deep learning in forecasting the occurrence of severe haze in Southeast Asia_, arXiv:2003.05763 | CNN on 35 years of meteorological and hydrological fields and visibility; binary haze at Singapore | No fire data; one site; does not test fire-direction information                                                               |
| GNN prescribed-fire PM2.5 forecasts, arXiv:2312.04291                                                                    | Aggregates FRP at 25–500 km with inverse-distance and wind-angle weighting                         | Wind weighting is a design choice, not isolated against a matched non-directional control; US; PM2.5 target                    |
| Santa Cruz daily PM2.5 (NHSJS 2026)                                                                                      | Fire predictors (IDW FRP ≤ 100 km) gave no significant gain over prior-day PM2.5 + weather         | Motivates honest ablation; no direction term; US                                                                               |
| Palangka Raya visibility (JAWMA 2022, doi:10.1080/10962247.2022.2077474)                                                 | Visibility vs PM2.5/PM10 2011–2020, non-linear; 2015 visibility < 0.2 mi                           | Relates visibility to PM, not to fire detections; no forecasting                                                               |
| Wildfire exposure metrics with ML (Sci Rep 2026, doi:10.1038/s41598-026-51766-7)                                         | Distance-weighted, wind-direction-aware fire exposure features                                     | Different pollutant and region; our contribution is the matched ablation + placebo + latency on a decade of tropical peat haze |
| Pontianak PM2.5 ensemble ML (Buletin Fisika 2026, doi:10.24843/BF.2026.v27.i02.p09)                                      | Local PM2.5, meteorology, lags; RF/XGBoost                                                         | PM2.5 target at one city; no directional fire features                                                                         |
| METAR fog/visibility ML, arXiv:2510.21819; Bangkok airport visibility (Atmosphere 2025)                                  | METAR-derived visibility targets; tree models                                                      | Fog/visibility, not fire-driven haze; no fire features                                                                         |
| Huang et al. (2024, GRL), haze and boundary layer in Singapore                                                           | Case study: SE low-level jet transports haze when hotspots rise                                    | Mechanism support for directional transport; not a forecasting evaluation                                                      |
| Hourly PM2.5 forecast usefulness, arXiv:2409.05866                                                                       | Decision-oriented evaluation                                                                       | Inspires the alert-rate metric                                                                                                 |

## Working novelty statement

This is the first multi-station, eleven-year (2015–2025) evaluation of whether the _directional_
component of satellite fire features adds skill to short-term haze-visibility forecasts at
airports across Borneo and Sumatra. It uses a matched non-directional control, rotated-wind
placebos, leave-one-year-out validation across several El Niño haze seasons, and explicit
fire-data latency. All data is open and keyless, and the model runs in a deployed public tool
(Pavana).

## To read in full before writing

- Wang 2020 (method, haze threshold).
- The GNN paper's ablation of the wind-weighted FRP.
- The Sci Rep 2026 exposure metrics paper (how direction enters).
- Any ASMC haze-forecast literature.
- Lee et al. (visibility trends in Southeast Asia).
