import { useInsights, useForecast } from '../../lib/queries';
import { t } from '../../lib/copy';
import {
  Card,
  Copy,
  DemoNotice,
  Page,
  QueryBoundary,
  SectionTitle,
  StateBadge,
} from '../../components/ui';
import { ForecastChart, HourlyForecast } from '../../components/Forecast';
import { Factors } from '../../components/Factors';

export default function InsightsScreen() {
  const insights = useInsights();
  const forecast = useForecast();
  return (
    <Page title={t.insights.title}>
      <QueryBoundary query={insights}>
        {(data) => (
          <>
            <DemoNotice
              show={
                data.state === 'demo' ||
                data.factors.some((factor) => factor.provenance.some((p) => p.isDemo))
              }
            />
            <Card>
              <SectionTitle>{t.insights.chartTitle}</SectionTitle>
              <StateBadge state={data.state} />
              <QueryBoundary query={forecast}>
                {(value) => (
                  <>
                    <ForecastChart forecast={value} />
                    <HourlyForecast forecast={value} />
                  </>
                )}
              </QueryBoundary>
            </Card>
            <Card>
              <SectionTitle>{t.insights.factorsTitle}</SectionTitle>
              <Factors factors={data.factors} timezone={data.location.timezone} />
            </Card>
            <Card>
              <SectionTitle>{t.insights.methodTitle}</SectionTitle>
              <Copy>
                {data.model.method === 'deterministic_indicators'
                  ? t.insights.methodDeterministic
                  : t.mobile.methodUnavailable}
              </Copy>
              <Copy heading style={{ marginTop: 20, marginBottom: 12 }}>
                {t.insights.howTitle}
              </Copy>
              {t.insights.howBody.map((paragraph) => (
                <Copy key={paragraph} muted style={{ fontSize: 12, marginBottom: 12 }}>
                  {paragraph}
                </Copy>
              ))}
            </Card>
          </>
        )}
      </QueryBoundary>
    </Page>
  );
}
