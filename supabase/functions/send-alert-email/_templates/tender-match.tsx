
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Img,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface TenderMatchEmailProps {
  tenderTitle: string;
  alertName: string;
  category: string;
  wilaya: string;
  deadline: string;
  tenderUrl: string;
}

export const TenderMatchEmail = ({
  tenderTitle,
  alertName,
  category,
  wilaya,
  deadline,
  tenderUrl,
}: TenderMatchEmailProps) => (
  <Html>
    <Head />
    <Preview>New Tender Match: {tenderTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header Section */}
        <Section style={header}>
          <Section style={logoContainer}>
            <Img
              src="/lovable-uploads/4f02ae1b-4b43-4d81-b9d7-5da7a3452bc2.png"
              alt="TendersPro"
              width={200}
              height={80}
              style={logoImage}
            />
            <Text style={tagline}>#1 Algerian Tenders</Text>
          </Section>
          <Heading style={title}>New Tender Match</Heading>
        </Section>

        {/* Content Section */}
        <Section style={content}>
          <Text style={alertText}>
            A new tender matching your alert "{alertName}" has been found:
          </Text>

          <Section style={tenderCard}>
            <Heading as="h2" style={tenderTitle}>{tenderTitle}</Heading>
            
            <Section style={detailsGrid}>
              <Section style={detailItem}>
                <Text style={detailLabel}>Category</Text>
                <Text style={detailValue}>{category}</Text>
              </Section>
              
              <Section style={detailItem}>
                <Text style={detailLabel}>Region</Text>
                <Text style={detailValue}>{wilaya}</Text>
              </Section>
              
              <Section style={detailItem}>
                <Text style={detailLabel}>Deadline</Text>
                <Text style={detailValue}>{deadline}</Text>
              </Section>
            </Section>

            <Section style={buttonContainer}>
              <Link style={buttonLink} href={tenderUrl}>
                View Tender Details
              </Link>
            </Section>
          </Section>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            You received this email because you enabled email notifications for tender alerts.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default TenderMatchEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px',
  borderBottom: '1px solid #e6ebf1',
}

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '16px',
}

const logoImage = {
  margin: '0 auto',
}

const tagline = {
  color: '#4b5563',
  fontSize: '16px',
  margin: '8px 0 0',
  textAlign: 'center' as const,
}

const title = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '16px 0',
}

const content = {
  padding: '32px',
}

const alertText = {
  color: '#374151',
  fontSize: '16px',
  margin: '0 0 24px',
}

const tenderCard = {
  padding: '24px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
}

const detailsGrid = {
  marginTop: '24px',
  marginBottom: '24px',
}

const detailItem = {
  marginBottom: '16px',
}

const detailLabel = {
  color: '#6b7280',
  fontSize: '14px',
  marginBottom: '4px',
}

const detailValue = {
  color: '#111827',
  fontSize: '16px',
  marginTop: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '24px',
}

const buttonLink = {
  backgroundColor: '#4f46e5',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  transition: 'background-color 0.2s',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
}

const footer = {
  padding: '0 32px',
  textAlign: 'center' as const,
}

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
}
