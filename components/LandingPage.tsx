import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla', 'Antigua & Barbuda',
  'Argentina', 'Armenia', 'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh',
  'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia', 'Bosnia & Herzegovina',
  'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada',
  'Cape Verde', 'Cayman Islands', 'Central African Republic', 'Chad', 'Chile', 'China', 'Christmas Island',
  'Cocos Island', 'Colombia', 'Comoros', 'Congo', 'Cook Islands', 'Costa Rica', 'Cote D\'Ivoire', 'Croatia'
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    gender: 'male',
    lookingFor: 'female',
    ageFrom: '18',
    ageTo: '25',
    country: 'Bangladesh'
  });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // Load template stylesheets dynamically
    const cssFiles = [
      '/css/bootstrap.min.css',
      '/css/animate.css',
      '/css/all.min.css',
      '/css/swiper.min.css',
      '/css/lightcase.css',
      '/css/style.css'
    ];

    const links: HTMLLinkElement[] = [];

    cssFiles.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-landing-page', 'true');
      document.head.appendChild(link);
      links.push(link);
    });

    // Initialize WOW.js if available
    if ((window as any).WOW) {
      new (window as any).WOW().init();
    }

    // Cleanup: Remove stylesheets when component unmounts
    return () => {
      links.forEach(link => link.remove());
    };
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const members = [
    { name: 'Smith Johnson', status: 'Active 10 days ago', image: '/assets/images/member/home3/01.jpg' },
    { name: 'Arika Q Smith', status: 'Active 15 days ago', image: '/assets/images/member/home3/02.jpg' },
    { name: 'William R Show', status: 'Active 10 days ago', image: '/assets/images/member/home3/03.jpg' },
    { name: 'Hanna Marcovick', status: 'Active 10 days ago', image: '/assets/images/member/home3/04.jpg' },
    { name: 'Smith Johnson', status: 'Active 10 days ago', image: '/assets/images/member/home3/05.jpg' },
    { name: 'Smith Johnson', status: 'Active 10 days ago', image: '/assets/images/member/home3/06.jpg' },
    { name: 'Arika Q Smith', status: 'Active 10 days ago', image: '/assets/images/member/home3/07.jpg' },
    { name: 'William R Show', status: 'Active 10 days ago', image: '/assets/images/member/home3/08.jpg' }
  ];

  const stats = [
    { number: '990.960', label: 'Members in Total' },
    { number: '628.590', label: 'Members Online' },
    { number: '314.587', label: 'Men Online' },
    { number: '102.369', label: 'Women Online' }
  ];

  const locations = [
    { name: 'London, UK', image: '/assets/images/meet/icon/02.jpg' },
    { name: 'Barcelona, Spain', image: '/assets/images/meet/icon/03.jpg' },
    { name: 'Taj Mahal, India', image: '/assets/images/meet/icon/04.jpg' },
    { name: 'Burj Al Arab, Dubai', image: '/assets/images/meet/icon/05.jpg' },
    { name: 'Paris, France', image: '/assets/images/meet/icon/06.jpg' }
  ];

  const stories = [
    { title: 'Dream places and locations to visit in 2022', category: 'Entertainment', image: '/assets/images/story/author/01.jpg' },
    { title: 'Make your dreams come true and monetise quickly', category: 'Love Stories', image: '/assets/images/story/author/02.jpg' },
    { title: 'Love looks not with the eyes, but with the mind', category: 'Attraction', image: '/assets/images/story/author/03.jpg' }
  ];

  const whyChooseTabs = [
    { label: 'Search Partner', icon: 'S' },
    { label: '100% Match', icon: 'M' },
    { label: 'Find Partner', icon: 'F' },
    { label: 'Live Story', icon: 'L' }
  ];

  return (
    <div>
      {/* Header */}
      <header className="header header--style2" id="navbar">
        <div className="header__top d-none d-lg-block">
          <div className="container">
            <div className="header__top--area">
              <div className="header__top--left">
                <ul>
                  <li>
                    <i className="fa-solid fa-phone"></i> <span>+800-123-4567 6587</span>
                  </li>
                  <li>
                    <i className="fa-solid fa-location-dot"></i> Beverley, New York 224 USA
                  </li>
                </ul>
              </div>
              <div className="header__top--right">
                <ul>
                  <li><a href="#"><i className="fa-brands fa-facebook-messenger"></i></a></li>
                  <li><a href="#"><i className="fa-brands fa-twitter"></i></a></li>
                  <li><a href="#"><i className="fa-brands fa-vimeo-v"></i></a></li>
                  <li><a href="#"><i className="fa-brands fa-skype"></i></a></li>
                  <li><a href="#"><i className="fa-solid fa-rss"></i></a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="header__bottom">
          <div className="container">
            <nav className="navbar navbar-expand-lg">
              <a className="navbar-brand" href="#"><img src="/assets/images/logo/logo.png" alt="logo" style={{ height: '40px', width: 'auto' }} /></a>
              <button className="navbar-toggler collapsed" type="button" data-bs-toggle="collapse"
                data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false"
                aria-label="Toggle navigation">
                <span className="navbar-toggler--icon"></span>
              </button>
              <div className="collapse navbar-collapse justify-content-end" id="navbarNavAltMarkup">
                <div className="navbar-nav mainmenu">
                  <ul>
                    <li className="active">
                      <a href="#0">Home</a>
                    </li>
                    <li>
                      <a href="#0">Pages</a>
                    </li>
                    <li>
                      <a href="#0">Community</a>
                    </li>
                    <li>
                      <a href="#0">Shops</a>
                    </li>
                    <li>
                      <a href="#0">Blogs</a>
                    </li>
                    <li><a href="#0">Contact</a></li>
                  </ul>
                </div>
                <ul className="button-group">
                  <li><a href="javascript:void(0)" onClick={() => navigate('/login')} className="default-btn login"><i className="fa-solid fa-user"></i> <span>LOG IN</span> </a></li>
                  <li><a href="javascript:void(0)" onClick={() => navigate('/login')} className="default-btn signup"><i className="fa-solid fa-users"></i> <span>SIGN UP</span> </a></li>
                </ul>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Banner Section */}
      <div className="banner banner--style3 padding-top bg_img" style={{ backgroundImage: 'url(/assets/images/banner/shape/home3/bg-3.jpg)' }}>
        <div className="container">
          <div className="row g-0 justify-content-center justify-content-xl-between">
            <div className="col-lg-5 col-12 wow fadeInLeft" data-wow-duration="1.5s">
              <div className="banner__content">
                <div className="banner__title">
                  <h2>We Have More Than <span>2.000.000</span> Join Members</h2>
                  <p>Still looking for your significant other? lunesa is the place for you! Join now to meet single men and women worldwide.</p>
                  <a href="javascript:void(0)" onClick={() => navigate('/login')} className="default-btn style-2"><span>Registration Now</span></a>
                </div>
              </div>
            </div>
            <div className="col-lg-6 col-12 wow fadeInUp" data-wow-duration="1.5s">
              <div className="banner__thumb text-xl-end">
                <img src="/assets/images/banner/shape/home3/03.png" alt="banner" style={{ maxWidth: '100%', height: 'auto' }} />
                <div className="banner__thumb--shape">
                  <div className="shapeimg">
                    <img src="/assets/images/about/icon/home3/01.png" alt="dating thumb" />
                  </div>
                </div>
                <div className="banner__thumb--title">
                  <h4>Are You Waiting For Dating?</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Form Section */}
      <div className="about about--style3 padding-top pt-xl-0">
        <div className="container">
          <div className="section__wrapper wow fadeInUp" data-wow-duration="1.5s">
            <form action="#">
              <div className="banner__list">
                <div className="row align-items-center row-cols-xl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1">
                  <div className="col-6">
                    <label>I am a</label>
                    <div className="banner__inputlist">
                      <select name="gender" value={formData.gender} onChange={handleFormChange}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="others">Others</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <label>Looking for</label>
                    <div className="banner__inputlist">
                      <select name="lookingFor" value={formData.lookingFor} onChange={handleFormChange}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="others">Others</option>
                      </select>
                    </div>
                  </div>
                  <div className="col">
                    <label>Age</label>
                    <div className="row">
                      <div className="col-6">
                        <div className="banner__inputlist">
                          <select name="ageFrom" value={formData.ageFrom} onChange={handleFormChange}>
                            {[...Array(40)].map((_, i) => (
                              <option key={i} value={18 + i}>{18 + i}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="banner__inputlist">
                          <select name="ageTo" value={formData.ageTo} onChange={handleFormChange}>
                            {[...Array(40)].map((_, i) => (
                              <option key={i} value={18 + i}>{18 + i}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col">
                    <label>Country</label>
                    <div className="banner__inputlist">
                      <select name="country" value={formData.country} onChange={handleFormChange}>
                        {countries.map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col">
                    <button type="button" onClick={() => navigate('/login')} className="default-btn style-2" style={{ width: '100%' }}>
                      <span>Find Your Partner</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Members / Only True People */}
      <div className="member member--style3 padding-top padding-bottom">
        <div className="container">
          <div className="section__header style-2 text-center wow fadeInUp" data-wow-duration="1.5s">
            <h2>Only True People</h2>
            <p>Learn from them and try to make it to this board. This will for sure boost you visibility and increase your chances to find you loved one.</p>
          </div>
          <div className="section__wrapper">
            <div className="row g-0 mx-12-none justify-content-center wow fadeInUp" data-wow-duration="1.5s">
              {members.map((member, idx) => (
                <div key={idx} className="member__item">
                  <div className="member__inner">
                    <div className="member__thumb">
                      <img src={member.image} alt={member.name} />
                    </div>
                    <div className="member__content">
                      <a href="#0"><h5>{member.name}</h5></a>
                      <p>{member.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="meet padding-top padding-bottom" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="section__header text-center">
                <h2>It All Starts With A Date</h2>
              </div>
            </div>
          </div>
          <div className="row g-4 mt-4">
            {stats.map((stat, idx) => (
              <div key={idx} className="col-lg-3 col-md-6 col-12 wow fadeInUp" data-wow-duration={`${1.2 + idx * 0.1}s`}>
                <div className="meet__item text-center">
                  <div className="meet__item--icon" style={{ fontSize: '48px', fontWeight: 'bold', color: '#2ba6cb', marginBottom: '15px' }}>
                    {stat.number}
                  </div>
                  <h5>{stat.label}</h5>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Locations Section */}
      <div className="work padding-top padding-bottom">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="section__header text-center">
                <h2>Meet Singles From Around The World</h2>
              </div>
            </div>
          </div>
          <div className="row g-4 mt-4">
            {locations.map((location, idx) => (
              <div key={idx} className="col-lg-4 col-md-6 col-12 wow fadeInUp" data-wow-duration={`${1.2 + idx * 0.1}s`}>
                <div className="work__item">
                  <a href="#0" className="work__item--thumb">
                    <img src={location.image} alt={location.name} className="w-100" />
                  </a>
                  <div className="work__item--content">
                    <h5><a href="#0">{location.name}</a></h5>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Section */}
      <div className="about padding-top padding-bottom" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="section__header text-center">
                <h2>Why Choose lunesa</h2>
              </div>
            </div>
          </div>
          <div className="row mt-4">
            <div className="col-12">
              <div className="tab" role="tablist">
                <div className="tab__button" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  {whyChooseTabs.map((tab, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`default-btn ${activeTab === idx ? 'style-2' : 'reverse'}`}
                      style={{
                        padding: '12px 25px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
                <div className="tab__content" style={{ backgroundColor: '#fff', padding: '50px', borderRadius: '4px', textAlign: 'center' }}>
                  <p style={{ fontSize: '16px', lineHeight: '1.7', color: '#555555' }}>
                    {whyChooseTabs[activeTab].label} - Discover what makes lunesa the perfect platform for finding your match.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Stories Section */}
      <div className="blog padding-top padding-bottom">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="section__header text-center">
                <h2>Success Stories</h2>
                <p>Read real stories from our happy members who found love on lunesa</p>
              </div>
            </div>
          </div>
          <div className="row g-4 mt-4">
            {stories.map((story, idx) => (
              <div key={idx} className="col-lg-4 col-md-6 col-12 wow fadeInUp" data-wow-duration={`${1.2 + idx * 0.1}s`}>
                <div className="blog__item">
                  <a href="#0" className="blog__item--thumb">
                    <img src={story.image} alt={story.title} className="w-100" />
                  </a>
                  <div className="blog__item--content">
                    <h6 className="blog__item--meta">{story.category}</h6>
                    <h4><a href="#0">{story.title}</a></h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust & Safety / Membership */}
      <div className="about padding-top padding-bottom" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="about__item" style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '4px' }}>
                <h4 style={{ marginBottom: '15px', color: '#213366' }}>Trust & Safety</h4>
                <p style={{ color: '#555555', lineHeight: '1.7' }}>We prioritize your safety with advanced verification, secure messaging, and 24/7 moderation to ensure every member is authentic.</p>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="about__item" style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '4px' }}>
                <h4 style={{ marginBottom: '15px', color: '#213366' }}>Premium Membership</h4>
                <p style={{ color: '#555555', lineHeight: '1.7' }}>Unlock unlimited messaging, see who liked you, advanced search filters, and other premium features to enhance your dating experience.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer padding-top">
        <div className="footer__newsletter">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="footer__newsletter--content text-center">
                  <h2>Subscribe Our Newsletter</h2>
                  <form action="#">
                    <input type="email" placeholder="Enter Your Email" required />
                    <button type="submit" className="default-btn style-2"><span>Subscribe Now</span></button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer__content padding-top">
          <div className="container">
            <div className="row g-5 g-lg-4">
              <div className="col-lg-3 col-sm-6 col-12">
                <div className="footer__content--desc">
                  <h4>About lunesa</h4>
                  <p>We are a leading dating platform connecting singles worldwide.</p>
                </div>
              </div>
              <div className="col-lg-3 col-sm-6 col-12">
                <div className="footer__content--desc">
                  <h4>Featured Members</h4>
                  <ul>
                    <li><a href="#0">Top Members</a></li>
                    <li><a href="#0">New Members</a></li>
                    <li><a href="#0">Online Now</a></li>
                  </ul>
                </div>
              </div>
              <div className="col-lg-3 col-sm-6 col-12">
                <div className="footer__content--desc">
                  <h4>Support</h4>
                  <ul>
                    <li><a href="#0">Contact Us</a></li>
                    <li><a href="#0">FAQ</a></li>
                    <li><a href="#0">Privacy Policy</a></li>
                  </ul>
                </div>
              </div>
              <div className="col-lg-3 col-sm-6 col-12">
                <div className="footer__content--desc">
                  <h4>Recent Activity</h4>
                  <ul>
                    <li>10 new members online</li>
                    <li>5 new success stories</li>
                    <li>2 verified profiles</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer__bottom wow fadeInUp" data-wow-duration="1.5s">
          <div className="container">
            <div className="row g-4 g-lg-0 justify-content-lg-between align-items-center">
              <div className="col-lg-6 col-12">
                <div className="footer__content text-center">
                  <p className="mb-0">All Rights Reserved © <a href="#0">lunesa</a> || Design By: CodexCoder</p>
                </div>
              </div>
              <div className="col-lg-6 col-12">
                <div className="footer__newsletter--social">
                  <ul className="justify-content-center justify-content-lg-end">
                    <li><a href="#0"><i className="fa-brands fa-twitter"></i></a></li>
                    <li><a href="#0"><i className="fa-brands fa-twitch"></i></a></li>
                    <li><a href="#0"><i className="fa-brands fa-instagram"></i></a></li>
                    <li><a href="#0"><i className="fa-brands fa-dribbble"></i></a></li>
                    <li><a href="#0"><i className="fa-brands fa-facebook-messenger"></i></a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
