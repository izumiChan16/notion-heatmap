import 'server-only';
import { isFullDataSource, type Client, type DataSourceObjectResponse } from '@notionhq/client';
import { AppError } from '@/lib/errors';
import type { FilterProperty, SchemaResponse } from '@/types/api';
import { resolvePrimaryDataSource } from './resolveDataSource';

function databaseTitle(title: Array<{ plain_text: string }>): string {
  return title.map((item) => item.plain_text).join('').trim() || 'Untitled database';
}

function toFilterProperty(
  property: DataSourceObjectResponse['properties'][string],
): FilterProperty | null {
  if (property.type === 'status') {
    return {
      name: property.name,
      type: 'status',
      options: property.status.options.map((item) => item.name),
    };
  }
  if (property.type === 'select') {
    return {
      name: property.name,
      type: 'select',
      options: property.select.options.map((item) => item.name),
    };
  }
  if (property.type === 'multi_select') {
    return {
      name: property.name,
      type: 'multi_select',
      options: property.multi_select.options.map((item) => item.name),
    };
  }
  if (property.type === 'checkbox') return { name: property.name, type: 'checkbox' };
  return null;
}

export async function readDatabaseSchema(notion: Client, databaseId: string): Promise<SchemaResponse> {
  const { database, dataSourceId } = await resolvePrimaryDataSource(notion, databaseId);
  const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });

  if (!isFullDataSource(dataSource)) {
    throw new AppError('DATABASE_INVALID', 400, 'The data source schema is incomplete.');
  }

  const properties = Object.values(dataSource.properties);
  const dateProperties = properties
    .filter((property) => property.type === 'date')
    .map((property) => ({ name: property.name, type: 'date' as const }));
  const filterProperties = properties
    .map(toFilterProperty)
    .filter((property): property is FilterProperty => property !== null);

  if (dateProperties.length === 0) {
    throw new AppError('DATABASE_NO_DATE_FIELD', 400, 'This database has no date property.');
  }

  return {
    databaseId,
    databaseName: databaseTitle(database.title),
    dateProperties,
    filterProperties,
  };
}
