import {useLoaderData} from '@remix-run/react';
import {getCustomer} from './($locale).account';
import {AccountAddressBook} from '~/components';

import {defer, redirect} from '@shopify/remix-oxygen';
import {flattenConnection} from '@shopify/hydrogen';
import {CACHE_NONE} from '~/data/cache';

export async function loader({context, params}) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  const isAuthenticated = Boolean(customerAccessToken);
  const loginPath = params.locale
    ? `/${params.locale}/account/login`
    : '/account/login';

  if (!isAuthenticated) {
    return redirect(loginPath);
  }

  const customer = await getCustomer(context, customerAccessToken);
  const addresses = flattenConnection(customer.addresses);

  return defer(
    {
      isAuthenticated,
      customer,
      addresses,
    },
    {
      headers: {
        'Cache-Control': CACHE_NONE,
      },
    },
  );
}

export default function AccountAddress() {
  const {customer, addresses} = useLoaderData();

  return <AccountAddressBook addresses={addresses} customer={customer} />;
}
