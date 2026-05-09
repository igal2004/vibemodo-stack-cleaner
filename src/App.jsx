import {
  AppProvider,
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  DataTable,
  Divider,
  EmptyState,
  InlineStack,
  Layout,
  List,
  Page,
  Spinner,
  Text
} from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { useCallback, useEffect, useMemo, useState } from 'react';

const emptyScan = {
  status: 'idle',
  auditTrail: [],
  scripts: [],
  summary: null,
  requirements: []
};

export default function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <div className="app-shell">
        <StackCleanerApp />
      </div>
    </AppProvider>
  );
}

function StackCleanerApp() {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [scan, setScan] = useState(emptyScan);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [staging, setStaging] = useState(null);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    setConfigError(null);

    try {
      const response = await fetch('/api/config');
      const payload = await response.json();
      setConfig(payload);
    } catch (error) {
      setConfigError(error.message);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const runScan = useCallback(async () => {
    setScanning(true);
    setStaging(null);

    try {
      const response = await fetch('/api/scan', { method: 'POST' });
      const payload = await response.json();
      setScan({
        ...payload,
        status: response.ok ? 'complete' : 'blocked'
      });
    } catch (error) {
      setScan({
        status: 'error',
        message: error.message,
        auditTrail: [{ level: 'error', message: error.message, source: 'browser' }],
        scripts: [],
        summary: null,
        requirements: []
      });
    } finally {
      setScanning(false);
    }
  }, []);

  const stageRemediation = useCallback(async (script) => {
    const response = await fetch('/api/remediate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptSrc: script.src, file: script.file })
    });
    const payload = await response.json();
    setStaging(payload);
  }, []);

  const configMissing = config?.missingRequired || [];
  const rows = useMemo(() => {
    return (scan.scripts || []).map((script) => [
      <span className="truncate-url" title={script.src} key={`${script.src}-url`}>
        {script.src}
      </span>,
      script.source,
      <Badge key={`${script.src}-status`} tone={toneForStatus(script.status)}>
        {script.status}
      </Badge>,
      script.owner || 'Not attributed',
      script.remediationEligible ? (
        <Button key={`${script.src}-stage`} onClick={() => stageRemediation(script)}>
          Stage remediation
        </Button>
      ) : (
        <Text key={`${script.src}-blocked`} as="span" tone="subdued">
          Review only
        </Text>
      )
    ]);
  }, [scan.scripts, stageRemediation]);

  return (
    <Page
      title="VIBEMODO Stack Cleaner"
      subtitle="Read-only Shopify script audit for storefront HTML and theme Liquid files"
      primaryAction={{
        content: scanning ? 'Scanning' : 'Run real scan',
        onAction: runScan,
        disabled: scanning
      }}
      secondaryActions={[{ content: 'Refresh config', onAction: loadConfig }]}
    >
      <BlockStack gap="400">
        {loadingConfig ? (
          <Card>
            <InlineStack gap="300" blockAlign="center">
              <Spinner size="small" />
              <Text as="p">Checking Shopify configuration...</Text>
            </InlineStack>
          </Card>
        ) : null}

        {configError ? (
          <Banner tone="critical" title="Configuration endpoint is unavailable">
            <p>{configError}</p>
          </Banner>
        ) : null}

        {config && !config.configured ? (
          <Banner tone="warning" title="App is not configured for real Shopify data">
            <BlockStack gap="200">
              <p>No scan will run with simulated data. Add the missing variables and restart the server.</p>
              <List>
                {configMissing.map((item) => (
                  <List.Item key={item}>{item}</List.Item>
                ))}
              </List>
            </BlockStack>
          </Banner>
        ) : null}

        {config?.configured ? (
          <Banner tone="success" title="Configured for live Shopify API reads">
            <p>Scan actions use the Admin GraphQL API and public storefront HTML. Mutations remain gated.</p>
          </Banner>
        ) : null}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Scan summary
                  </Text>
                  {scan.summary ? (
                    <InlineStack gap="600">
                      <Metric label="Scripts found" value={scan.summary.totalScripts} />
                      <Metric label="Unattributed" value={scan.summary.unattributedScripts} />
                      <Metric label="Theme files inspected" value={scan.summary.themeFilesInspected} />
                    </InlineStack>
                  ) : (
                    <EmptyState
                      heading={scan.status === 'blocked' ? 'Scan blocked by configuration' : 'No real scan has run'}
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>Run a scan after Shopify credentials are configured. The app will not invent scan results.</p>
                    </EmptyState>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Script inventory
                  </Text>
                  {rows.length ? (
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                      headings={['Script', 'Source', 'Status', 'Owner', 'Action']}
                      rows={rows}
                    />
                  ) : (
                    <Text as="p" tone="subdued">
                      No script inventory is available until a real scan completes.
                    </Text>
                  )}
                </BlockStack>
              </Card>

              {staging ? (
                <Banner tone="info" title="Remediation staged, mutation blocked">
                  <BlockStack gap="200">
                    <p>{staging.message}</p>
                    <p>{staging.approvalGate}</p>
                  </BlockStack>
                </Banner>
              ) : null}
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Configuration status
                  </Text>
                  <ConfigRow label="Embedded App Bridge" ok={Boolean(config?.appBridge?.configured)} />
                  <ConfigRow label="Admin GraphQL API" ok={Boolean(config?.adminApi?.configured)} />
                  <ConfigRow label="Theme file scan" ok={Boolean(config?.themeScan?.configured)} />
                  <Divider />
                  <Text as="p" tone="subdued">
                    Required scopes: {config?.requiredScopes?.join(', ') || 'read_themes, read_apps'}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Audit trail
                  </Text>
                  {(scan.auditTrail || []).length ? (
                    <BlockStack gap="200">
                      {scan.auditTrail.map((entry, index) => (
                        <Box key={`${entry.message}-${index}`} padding="200" background="bg-surface-secondary" borderRadius="200">
                          <Text as="p" variant="bodySm" fontWeight="semibold">
                            {entry.source}
                          </Text>
                          <Text as="p" variant="bodySm" tone={entry.level === 'error' ? 'critical' : 'subdued'}>
                            {entry.message}
                          </Text>
                        </Box>
                      ))}
                    </BlockStack>
                  ) : (
                    <Text as="p" tone="subdued">
                      Scan steps will appear here with their real data source.
                    </Text>
                  )}
                </BlockStack>
              </Card>

              {scan.requirements?.length ? (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Missing requirements
                    </Text>
                    <List>
                      {scan.requirements.map((requirement) => (
                        <List.Item key={requirement}>{requirement}</List.Item>
                      ))}
                    </List>
                  </BlockStack>
                </Card>
              ) : null}
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function Metric({ label, value }) {
  return (
    <BlockStack gap="100">
      <Text as="span" tone="subdued">
        {label}
      </Text>
      <Text as="strong" variant="headingLg">
        {value}
      </Text>
    </BlockStack>
  );
}

function ConfigRow({ label, ok }) {
  return (
    <InlineStack align="space-between">
      <Text as="span">{label}</Text>
      <Badge tone={ok ? 'success' : 'warning'}>{ok ? 'Ready' : 'Missing'}</Badge>
    </InlineStack>
  );
}

function toneForStatus(status) {
  if (status === 'attributed') return 'success';
  if (status === 'unattributed') return 'warning';
  if (status === 'blocked') return 'critical';
  return 'info';
}
