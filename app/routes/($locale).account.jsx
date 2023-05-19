import {
  Await,
  Form,
  Outlet,
  useLoaderData,
  useMatches,
  useOutlet,
  Link,
} from '@remix-run/react';
import {Suspense} from 'react';
import {
  Button,
  OrderCard,
  PageHeader,
  Text,
  AccountDetails,
  AccountAddressBook,
  Modal,
  ProductSwimlane,
  IconAccountAddress,
  IconAccountDetails,
  IconOrderHistory,
} from '~/components';
import {FeaturedCollections} from '~/components/FeaturedCollections';
import {json, defer, redirect} from '@shopify/remix-oxygen';
import {flattenConnection} from '@shopify/hydrogen';
import {getFeaturedData} from './($locale).featured-products';
import {doLogout} from './($locale).account.logout';
import {usePrefixPathWithLocale} from '~/lib/utils';
import {CACHE_NONE, routeHeaders} from '~/data/cache';

export const headers = routeHeaders;

export async function loader({request, context, params}) {
  const {pathname} = new URL(request.url);
  const locale = params.locale;
  const customerAccessToken = await context.session.get('customerAccessToken');
  const isAuthenticated = Boolean(customerAccessToken);
  const loginPath = locale ? `/${locale}/account/login` : '/account/login';
  const isAccountPage = /^\/account\/?$/.test(pathname);

  if (!isAuthenticated) {
    if (isAccountPage) {
      return redirect(loginPath);
    }
    // pass through to public routes
    return json({isAuthenticated: false});
  }

  const customer = await getCustomer(context, customerAccessToken);

  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}.`
      : `Welcome to your account.`
    : 'Account Details';

  const orders = flattenConnection(customer.orders);

  return defer(
    {
      isAuthenticated,
      customer,
      heading,
      orders,
      addresses: flattenConnection(customer.addresses),
      featuredData: getFeaturedData(context.storefront),
    },
    {
      headers: {
        'Cache-Control': CACHE_NONE,
      },
    },
  );
}

export function Authenticated() {
  const data = useLoaderData();
  const outlet = useOutlet();
  const matches = useMatches();

  // routes that export handle { renderInModal: true }
  const renderOutletInModal = matches.some((match) => {
    return match?.handle?.renderInModal;
  });

  // Public routes
  if (!data.isAuthenticated) {
    return <Outlet />;
  }

  // Authenticated routes
  if (outlet) {
    if (renderOutletInModal) {
      return (
        <>
          <Modal cancelLink="/account">
            <Outlet context={{customer: data.customer}} />
          </Modal>
          <Account {...data} />
        </>
      );
    }
  }

  return <Account {...data} />;
}

export default function Account({heading}) {
  return (
    <>
      <div className="flex items-center space-x-4">
        <PageHeader heading={heading} />
        <Form method="post" action={usePrefixPathWithLocale('/account/logout')}>
          <button
            type="submit"
            className="text-primary/50 border border-gray-300 p-2 whitespace-nowrap mr-4"
          >
            Sign out
          </button>
        </Form>
      </div>
      <div className="flex">
        <div className="w-1/6 h-screen p-4">
          <ul className="flex flex-col space-y-4">
            <li className="my-4">
              <Link
                to="details"
                className="border border-gray_800 border-solid flex flex-row gap-[10px] items-center justify-between p-2 rounded-[5px]"
              >
                <p className="text-xl font-bold">Account Details</p>
                <IconAccountDetails />
              </Link>
            </li>
            <li>
              <Link
                to="addresses"
                className="border border-gray_800 border-solid flex flex-row gap-[27px] items-center justify-between p-2 rounded-[5px] w-full"
              >
                <p className="text-xl font-bold">Addresses</p>
                <IconAccountAddress />
              </Link>
            </li>
            <li>
              <Link
                to="orders"
                className="border border-gray_800 border-solid flex flex-row gap-[27px] items-center justify-between p-2 rounded-[5px] w-full"
              >
                <p className="text-xl font-bold">Order History</p>
                <IconOrderHistory />
              </Link>
            </li>
          </ul>
        </div>
        <div className="w-5/6 h-screen p-4 overflow-auto">
          <Outlet />
        </div>
      </div>
    </>
  );
}

const CUSTOMER_QUERY = `#graphql
  query CustomerDetails(
    $customerAccessToken: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customer(customerAccessToken: $customerAccessToken) {
      firstName
      lastName
      phone
      email
      defaultAddress {
        id
        formatted
        firstName
        lastName
        company
        address1
        address2
        country
        province
        city
        zip
        phone
      }
      addresses(first: 6) {
        edges {
          node {
            id
            formatted
            firstName
            lastName
            company
            address1
            address2
            country
            province
            city
            zip
            phone
          }
        }
      }
      orders(first: 250, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            orderNumber
            processedAt
            financialStatus
            fulfillmentStatus
            currentTotalPrice {
              amount
              currencyCode
            }
            lineItems(first: 2) {
              edges {
                node {
                  variant {
                    image {
                      url
                      altText
                      height
                      width
                    }
                  }
                  title
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function getCustomer(context, customerAccessToken) {
  const {storefront} = context;

  const data = await storefront.query(CUSTOMER_QUERY, {
    variables: {
      customerAccessToken,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });

  /**
   * If the customer failed to load, we assume their access token is invalid.
   */
  if (!data || !data.customer) {
    throw await doLogout(context);
  }

  return data.customer;
}
