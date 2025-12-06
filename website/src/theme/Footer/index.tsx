import React from 'react';
import Footer from '@theme-original/Footer';
import type FooterType from '@theme/Footer';
import type { WrapperProps } from '@docusaurus/types';
import Sponsors from '@site/src/components/Sponsors';

type Props = WrapperProps<typeof FooterType>;

function BuyMeACoffee() {
  return (
    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
      <a href="https://www.buymeacoffee.com/naomiaro" target="_blank" rel="noopener noreferrer">
        <img
          src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png"
          alt="Buy Me A Coffee"
          style={{ height: '40px', width: '145px' }}
        />
      </a>
    </div>
  );
}

export default function FooterWrapper(props: Props): React.ReactNode {
  return (
    <>
      <Sponsors />
      <BuyMeACoffee />
      <Footer {...props} />
    </>
  );
}
