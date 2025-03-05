import pytest
from harvest import (
    CatalogItem,
    CatalogItemWithToc,
    toc_from_code,
    Config,
    config_from_code,
    TocEntry,
    merge_tocs,
    enrich_catalog_item,
    toc_from_html,
)

# For data use https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability
item = CatalogItem(
    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/intro.html",
    code_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability",
    release="v0.1",
    toc_path="book/_toc.yml",
)


# TODO mark skip tests with custom remote mark
@pytest.mark.skip("Goes to the internet")
def test_toc_from_code():
    toc = toc_from_code(item)
    expected = {
        "format": "jb-book",
        "root": "intro.md",
        "parts": [
            {
                "caption": "Contents",
                "chapters": [
                    {
                        "file": "prob-design/overview.md",
                        "sections": [
                            {"file": "prob-design/01-one-random-variable.md"},
                            {"file": "prob-design/02-two-random-variables.md"},
                        ],
                    },
                    {
                        "file": "risk-analysis/overview.md",
                        "sections": [
                            {"file": "risk-analysis/definition.md"},
                            {"file": "risk-analysis/steps.md"},
                            {"file": "risk-analysis/risk-curves.md"},
                        ],
                    },
                    {
                        "file": "reliability-component/overview.md",
                        "sections": [
                            {"file": "reliability-component/contamination.ipynb"}
                        ],
                    },
                    {
                        "file": "reliability-system/overview.md",
                        "sections": [
                            {"file": "reliability-system/exercise-simple-city.md"}
                        ],
                    },
                    {
                        "file": "risk-evaluation/overview.md",
                        "sections": [
                            {"file": "risk-evaluation/decision.md"},
                            {"file": "risk-evaluation/cost-benefit.md"},
                            {"file": "risk-evaluation/econ-optimization.md"},
                            {"file": "risk-evaluation/example-dike-height.md"},
                            {"file": "risk-evaluation/safety-standards.md"},
                        ],
                    },
                    {
                        "file": "exercises/overview.md",
                        "sections": [
                            {"file": "exercises/exercise-fn-curve.md"},
                            {"file": "exercises/exercise-paint.md"},
                            {"file": "exercises/exercise-dam.md"},
                            {"file": "exercises/exercise-sample-exam.md"},
                        ],
                    },
                    {"file": "references.md"},
                    {"file": "credits.md"},
                ],
            }
        ],
    }
    assert toc == expected


@pytest.mark.skip("Goes to the internet")
def test_config_from_code():
    config = config_from_code(item)
    expected = Config(
        title="Risk and Reliability for Engineers",
        logo="figures/cover_small.png",
        author="Robert Lanzafame",
    )
    assert config == expected


@pytest.mark.skip("Goes to the internet")
def test_toc_from_html():
    toc = toc_from_html(item.html_url)
    expected = [
        ("#", "Risk and Reliability for Engineers"),
        ("prob-design/overview.html", "Probabilistic Design"),
        ("prob-design/01-one-random-variable.html", "One Random Variable"),
        ("prob-design/02-two-random-variables.html", "Two Random Variables"),
        ("risk-analysis/overview.html", "Risk Analysis"),
        ("risk-analysis/definition.html", "Definition of Risk"),
        ("risk-analysis/steps.html", "Steps in a Risk Analysis"),
        ("risk-analysis/risk-curves.html", "Risk Curve"),
        ("reliability-component/overview.html", "Component Reliability"),
        ("reliability-component/contamination.html", "Contaminant Transport"),
        ("reliability-system/overview.html", "System Reliability"),
        ("reliability-system/exercise-simple-city.html", "Example System"),
        ("risk-evaluation/overview.html", "Risk Evaluation"),
        ("risk-evaluation/decision.html", "Decision Analysis"),
        ("risk-evaluation/cost-benefit.html", "Cost Benefit Analysis"),
        ("risk-evaluation/econ-optimization.html", "Economic Optimization"),
        ("risk-evaluation/example-dike-height.html", "Optimization Example"),
        ("risk-evaluation/safety-standards.html", "Safety Standards"),
        ("exercises/overview.html", "Exercises"),
        ("exercises/exercise-fn-curve.html", "FN Curve"),
        ("exercises/exercise-paint.html", "Paint System"),
        ("exercises/exercise-dam.html", "Dam and River"),
        ("exercises/exercise-sample-exam.html", "Sample Exam Questions"),
        ("references.html", "References"),
        ("credits.html", "Credits and License"),
    ]
    assert toc == expected


def test_merge_tocs():
    toc_yml = {
        "format": "jb-book",
        "root": "intro.md",
        "parts": [
            {
                "caption": "Contents",
                "chapters": [
                    {
                        "file": "prob-design/overview.md",
                        "sections": [
                            {"file": "prob-design/01-one-random-variable.md"},
                        ],
                    },
                    {"file": "credits.md"},
                ],
            }
        ],
    }
    toc_html = [
        ("#", "Risk and Reliability for Engineers"),
        ("prob-design/overview.html", "Probabilistic Design"),
        ("prob-design/01-one-random-variable.html", "One Random Variable"),
        ("credits.html", "Credits and License"),
    ]

    toc = merge_tocs(item=item, toc_yml=toc_yml, toc_html=toc_html)

    expected = TocEntry(
        title="Risk and Reliability for Engineers",
        html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/intro.html",
        external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/book/intro.md",
        children=[
            TocEntry(
                title="Contents",
                html_url=None,
                external_url=None,
                children=[
                    TocEntry(
                        title="Probabilistic Design",
                        html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/prob-design/overview.html",
                        external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/prob-design/overview.md",
                        children=[
                            TocEntry(
                                title="One Random Variable",
                                html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/prob-design/01-one-random-variable.html",
                                external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/prob-design/01-one-random-variable.md",
                                children=[],
                            )
                        ],
                    ),
                    TocEntry(
                        title="Credits and License",
                        html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/credits.html",
                        external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/credits.md",
                        children=[],
                    ),
                ],
            )
        ],
    )
    assert toc == expected


@pytest.mark.skip("Goes to the internet")
def test_enrich_catalog_item():
    enriched = enrich_catalog_item(item)
    expected = CatalogItemWithToc(
        html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/intro.html",
        code_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability",
        release="v0.1",
        toc_path="book/_toc.yml",
        title="Risk and Reliability for Engineers",
        logo="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/raw/v0.1/book/figures/cover_small.png",
        author="Robert Lanzafame",
        toc=TocEntry(
            title="Risk and Reliability for Engineers",
            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/intro.html",
            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/book/intro.md",
            children=[
                TocEntry(
                    title="Contents",
                    html_url=None,
                    external_url=None,
                    children=[
                        TocEntry(
                            title="Probabilistic Design",
                            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/prob-design/overview.html",
                            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/prob-design/overview.md",
                            children=[
                                TocEntry(
                                    title="One Random Variable",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/prob-design/01-one-random-variable.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/prob-design/01-one-random-variable.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Two Random Variables",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/prob-design/02-two-random-variables.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/prob-design/02-two-random-variables.md",
                                    children=[],
                                ),
                            ],
                        ),
                        TocEntry(
                            title="Risk Analysis",
                            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-analysis/overview.html",
                            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-analysis/overview.md",
                            children=[
                                TocEntry(
                                    title="Definition of Risk",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-analysis/definition.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-analysis/definition.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Steps in a Risk Analysis",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-analysis/steps.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-analysis/steps.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Risk Curve",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-analysis/risk-curves.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-analysis/risk-curves.md",
                                    children=[],
                                ),
                            ],
                        ),
                        TocEntry(
                            title="Component Reliability",
                            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/reliability-component/overview.html",
                            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/reliability-component/overview.md",
                            children=[
                                TocEntry(
                                    title="Contaminant Transport",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/reliability-component/contamination.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/reliability-component/contamination.ipynb",
                                    children=[],
                                )
                            ],
                        ),
                        TocEntry(
                            title="System Reliability",
                            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/reliability-system/overview.html",
                            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/reliability-system/overview.md",
                            children=[
                                TocEntry(
                                    title="Example System",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/reliability-system/exercise-simple-city.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/reliability-system/exercise-simple-city.md",
                                    children=[],
                                )
                            ],
                        ),
                        TocEntry(
                            title="Risk Evaluation",
                            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-evaluation/overview.html",
                            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-evaluation/overview.md",
                            children=[
                                TocEntry(
                                    title="Decision Analysis",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-evaluation/decision.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-evaluation/decision.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Cost Benefit Analysis",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-evaluation/cost-benefit.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-evaluation/cost-benefit.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Economic Optimization",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-evaluation/econ-optimization.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-evaluation/econ-optimization.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Optimization Example",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-evaluation/example-dike-height.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-evaluation/example-dike-height.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Safety Standards",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/risk-evaluation/safety-standards.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/risk-evaluation/safety-standards.md",
                                    children=[],
                                ),
                            ],
                        ),
                        TocEntry(
                            title="Exercises",
                            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/exercises/overview.html",
                            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/exercises/overview.md",
                            children=[
                                TocEntry(
                                    title="FN Curve",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/exercises/exercise-fn-curve.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/exercises/exercise-fn-curve.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Paint System",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/exercises/exercise-paint.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/exercises/exercise-paint.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Dam and River",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/exercises/exercise-dam.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/exercises/exercise-dam.md",
                                    children=[],
                                ),
                                TocEntry(
                                    title="Sample Exam Questions",
                                    html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/exercises/exercise-sample-exam.html",
                                    external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/exercises/exercise-sample-exam.md",
                                    children=[],
                                ),
                            ],
                        ),
                        TocEntry(
                            title="References",
                            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/references.html",
                            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/references.md",
                            children=[],
                        ),
                        TocEntry(
                            title="Credits and License",
                            html_url="https://interactivetextbooks.tudelft.nl/risk-reliability/credits.html",
                            external_url="https://gitlab.tudelft.nl/interactivetextbooks-citg/risk-and-reliability/-/blob/v0.1/credits.md",
                            children=[],
                        ),
                    ],
                )
            ],
        ),
    )
    assert enriched == expected
