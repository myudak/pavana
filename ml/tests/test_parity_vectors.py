"""Same vectors as packages/shared/test/math.test.ts — keeps Python and TypeScript in sync."""

import json

import numpy as np
import pytest

from pavana_ml.features.geo import bearing_to_unit, haversine_km
from pavana_ml.features.upwind import UpwindParams, upwind_exposure_score
from pavana_ml.features.wind import wind_from_to_flow_bearing
from pavana_ml.paths import TEST_VECTORS

V = json.loads(TEST_VECTORS.read_text(encoding="utf-8"))
TOL = V["tolerance"]


@pytest.mark.parametrize("case", V["haversineKm"])
def test_haversine(case):
    a, b = case["a"], case["b"]
    assert abs(float(haversine_km(a["lat"], a["lon"], b["lat"], b["lon"])) - case["expected"]) < TOL


@pytest.mark.parametrize("case", V["windFlowBearing"])
def test_wind_from_to(case):
    to = float(wind_from_to_flow_bearing(case["fromDeg"]))
    assert to == pytest.approx(case["expectedToDeg"])
    e, n = bearing_to_unit(to)
    assert abs(float(e) - case["expectedUnit"]["east"]) < TOL
    assert abs(float(n) - case["expectedUnit"]["north"]) < TOL


@pytest.mark.parametrize("case", V["upwindScore"]["cases"], ids=lambda c: c["name"])
def test_upwind_score(case):
    p = V["upwindScore"]["params"]
    params = UpwindParams(p["lambdaKm"], p["tauHours"], p["maxDistanceKm"], p["frpFallback"])
    hs = case["hotspots"]
    r = upwind_exposure_score(
        case["target"]["lat"],
        case["target"]["lon"],
        case["windFromDeg"],
        np.array([h["lat"] for h in hs]),
        np.array([h["lon"] for h in hs]),
        np.array([np.nan if h["frpMw"] is None else h["frpMw"] for h in hs]),
        np.array([h["ageHours"] for h in hs]),
        params,
    )
    assert abs(r.score - case["expectedScore"]) < TOL
    assert r.contributing_count == case["expectedContributing"]
