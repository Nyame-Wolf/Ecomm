import {useLoaderData} from '@remix-run/react';
import {AccountDetails} from '~/components';

export default function Details() {
  const data = useLoaderData();
  return <AccountDetails customer={data.customer} />;
}
