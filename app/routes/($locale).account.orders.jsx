import {useLoaderData, Outlet} from '@remix-run/react';
import {OrderCard, Button, Text} from '~/components';
import {usePrefixPathWithLocale} from '~/lib/utils';
import {json, defer, redirect} from '@shopify/remix-oxygen';
import {CACHE_NONE} from '~/data/cache';
import {flattenConnection} from '@shopify/hydrogen';
import {getCustomer} from './($locale).account';

export async function loader({request, context, params}) {
  const {pathname} = new URL(request.url);
  const locale = params.locale;
  const customerAccessToken = await context.session.get('customerAccessToken');
  const isAuthenticated = Boolean(customerAccessToken);
  const loginPath = locale ? `/${locale}/account/login` : '/account/login';
  const isAccountPage = /^\/account\/orders\/?$/.test(pathname);

  if (!isAuthenticated) {
    if (isAccountPage) {
      return redirect(loginPath);
    }
    return json({isAuthenticated: false});
  }

  const customer = await getCustomer(context, customerAccessToken);
  const orders = flattenConnection(customer.orders);

  return defer(
    {
      isAuthenticated,
      orders,
    },
    {
      headers: {
        'Cache-Control': CACHE_NONE,
      },
    },
  );
}

export default function AccountOrders() {
  const data = useLoaderData();

  // Public routes
  if (!data.isAuthenticated) {
    return <Outlet />;
  }

  return <AccountOrderHistory orders={data.orders} />;
}

function AccountOrderHistory({orders}) {
  return (
    <div className="mt-6">
      <div className="grid w-full gap-4 p-4 py-6 md:gap-8 md:p-8 lg:p-12">
        <h2 className="font-bold text-lead">Order History</h2>
        {orders?.length ? <Orders orders={orders} /> : <EmptyOrders />}
      </div>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div>
      <Text className="mb-1" size="fine" width="narrow" as="p">
        You haven&apos;t placed any orders yet.
      </Text>
      <div className="w-48">
        <Button
          className="w-full mt-2 text-sm"
          variant="secondary"
          to={usePrefixPathWithLocale('/')}
        >
          Start Shopping
        </Button>
      </div>
    </div>
  );
}

function Orders({orders}) {
  return (
    <ul className="grid grid-flow-row grid-cols-1 gap-2 gap-y-6 md:gap-4 lg:gap-6 false sm:grid-cols-3">
      {orders.map((order) => (
        <OrderCard order={order} key={order.id} />
      ))}
    </ul>
  );
}
