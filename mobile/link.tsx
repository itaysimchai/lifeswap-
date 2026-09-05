import React from 'react';
import { Link } from 'react-router-dom';
export default React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & {href:string;prefetch?:boolean;replace?:boolean}> (function MobileLink({href,prefetch,replace,...props},ref){void prefetch;if(/^(https?:|mailto:|tel:)/.test(href))return <a ref={ref} href={href} {...props}/>;return <Link ref={ref} to={href} replace={replace} {...props}/>;});
