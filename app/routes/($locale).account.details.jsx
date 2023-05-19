import {useLoaderData} from '@remix-run/react';
import {AccountDetails} from '~/components';
import {getCustomer} from './($locale).account';

export default function Details() {
  const data = useLoaderData();
  return (
    <>
      <AccountDetails customer={data.customer} />;
    </>
  );
}

export const loader = async ({context}) => {
  const customerAccessToken = await context.session.get('customerAccessToken');
  const customer = await getCustomer(context, customerAccessToken);

  return {customer};
};
