import React from 'react';

export default function ViewerLayout({ children, toolbar }) {
	return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<div style={{ flex: '0 0 auto' }}>
				{toolbar}
			</div>
			<div style={{ flex: 1, position: 'relative' }}>
				{children}
			</div>
		</div>
	);
}
