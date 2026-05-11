import { NextRequest, NextResponse } from 'next/server';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const APOLLO_BASE_URL = 'https://api.apollo.io';

export async function POST(request: NextRequest) {
  if (!APOLLO_API_KEY) {
    return NextResponse.json(
      { error: 'Apollo API key not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'people_search') {
      // Search for people by name, title, org
      const response = await fetch(`${APOLLO_BASE_URL}/v1/mixed_people/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': APOLLO_API_KEY,
        },
        body: JSON.stringify({
          person_titles: params.titles || [],
          q_organization_name: params.organization || '',
          person_names: params.name ? [params.name] : [],
          page: 1,
          per_page: params.per_page || 5,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return NextResponse.json(
          { error: data.message || 'Apollo API error', details: data },
          { status: response.status }
        );
      }

      // Return cleaned results
      const people = (data.people || []).map((person: any) => ({
        id: person.id,
        name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
        first_name: person.first_name,
        last_name: person.last_name,
        title: person.title,
        email: person.email,
        email_status: person.email_status,
        linkedin_url: person.linkedin_url,
        organization: person.organization?.name || '',
        organization_website: person.organization?.website_url || '',
        city: person.city,
        state: person.state,
        country: person.country,
        departments: person.departments || [],
        seniority: person.seniority,
      }));

      return NextResponse.json({
        people,
        total: data.pagination?.total_entries || 0,
      });
    }

    if (action === 'enrich_person') {
      // Enrich a specific person by name + domain
      const response = await fetch(`${APOLLO_BASE_URL}/v1/people/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': APOLLO_API_KEY,
        },
        body: JSON.stringify({
          first_name: params.first_name,
          last_name: params.last_name,
          organization_name: params.organization,
          domain: params.domain,
          linkedin_url: params.linkedin_url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.message || 'Apollo enrichment error', details: data },
          { status: response.status }
        );
      }

      const person = data.person;
      if (!person) {
        return NextResponse.json({ person: null });
      }

      return NextResponse.json({
        person: {
          name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
          first_name: person.first_name,
          last_name: person.last_name,
          title: person.title,
          email: person.email,
          email_status: person.email_status,
          linkedin_url: person.linkedin_url,
          organization: person.organization?.name || '',
          organization_website: person.organization?.website_url || '',
          city: person.city,
          state: person.state,
          country: person.country,
        },
      });
    }

    if (action === 'org_search') {
      // Search organizations
      const response = await fetch(`${APOLLO_BASE_URL}/v1/mixed_companies/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': APOLLO_API_KEY,
        },
        body: JSON.stringify({
          q_organization_name: params.query || '',
          organization_locations: params.locations || [],
          per_page: params.per_page || 5,
          page: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.message || 'Apollo org search error', details: data },
          { status: response.status }
        );
      }

      const organizations = (data.organizations || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        website: org.website_url,
        linkedin_url: org.linkedin_url,
        industry: org.industry,
        estimated_num_employees: org.estimated_num_employees,
        city: org.city,
        state: org.state,
        country: org.country,
        short_description: org.short_description,
        keywords: org.keywords || [],
      }));

      return NextResponse.json({
        organizations,
        total: data.pagination?.total_entries || 0,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: people_search, enrich_person, org_search' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
