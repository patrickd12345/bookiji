export default function BlogPage() {
  const blogPosts = [
    {
      id: 1,
      title: "The Future of Service Booking: Why $1 Commitment Fees Are Game-Changing",
      excerpt: "Discover how our innovative $1 commitment fee system is revolutionizing the service booking industry by eliminating no-shows and building trust between customers and providers.",
      date: "2024-01-15",
      category: "Industry Insights",
      slug: "future-of-service-booking-commitment-fees"
    },
    {
      id: 2,
      title: "5 Ways AI is Transforming How We Book Services",
      excerpt: "Explore how artificial intelligence is making service booking smarter, faster, and more personalized than ever before.",
      date: "2024-01-12",
      category: "Technology",
      slug: "ai-transforming-service-booking"
    },
    {
      id: 3,
      title: "Privacy-First Booking: How Map Abstraction Protects Your Location",
      excerpt: "Learn about our innovative map abstraction technology that lets you find nearby services without compromising your privacy.",
      date: "2024-01-10",
      category: "Privacy & Security",
      slug: "privacy-first-booking-map-abstraction"
    },
    {
      id: 4,
      title: "From Plumbers to Personal Trainers: The Universal Booking Revolution",
      excerpt: "Why one platform for all services is the future of the booking industry and how it benefits both customers and providers.",
      date: "2024-01-08",
      category: "Platform Features",
      slug: "universal-booking-revolution"
    },
    {
      id: 5,
      title: "Building Trust in the Gig Economy: Guaranteed Bookings Explained",
      excerpt: "How guaranteed bookings are creating a more reliable and trustworthy marketplace for service providers and customers.",
      date: "2024-01-05",
      category: "Industry Insights",
      slug: "building-trust-gig-economy-guaranteed-bookings"
    },
    {
      id: 6,
      title: "Real-Time Availability: The End of Phone Tag for Service Bookings",
      excerpt: "Say goodbye to endless phone calls and waiting for callbacks. Real-time availability is changing how we book services.",
      date: "2024-01-03",
      category: "Technology",
      slug: "real-time-availability-end-phone-tag"
    }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Bookiji Blog</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Insights, tips, and updates from the world of service booking and the future of the on-demand economy.
        </p>
      </div>

      {/* Featured Post */}
      <div className="mb-12">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-lg">
          <div className="max-w-3xl">
            <span className="inline-block bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm mb-4">
              Featured
            </span>
            <h2 className="text-3xl font-bold mb-4">
              {blogPosts[0].title}
            </h2>
            <p className="text-lg mb-6 text-blue-100">
              {blogPosts[0].excerpt}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-blue-200">
                {new Date(blogPosts[0].date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <a 
                href={`/blog/${blogPosts[0].slug}`}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Read More
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogPosts.slice(1).map((post) => (
          <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-blue-600 font-medium">{post.category}</span>
                <span className="text-sm text-gray-500">
                  {new Date(post.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3 line-clamp-2">
                {post.title}
              </h3>
              <p className="text-gray-600 mb-4 line-clamp-3">
                {post.excerpt}
              </p>
              <a 
                href={`/blog/${post.slug}`}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Read More →
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* Categories */}
      <div className="mt-16 bg-gray-50 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Explore by Category</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Industry Insights", count: 8, color: "blue" },
            { name: "Technology", count: 6, color: "green" },
            { name: "Privacy & Security", count: 4, color: "purple" },
            { name: "Platform Features", count: 5, color: "orange" }
          ].map((category) => (
            <div key={category.name} className="text-center">
              <div className={`bg-${category.color}-100 text-${category.color}-800 p-4 rounded-lg hover:bg-${category.color}-200 transition-colors cursor-pointer`}>
                <h3 className="font-semibold mb-1">{category.name}</h3>
                <p className="text-sm">{category.count} articles</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter Signup */}
      <div className="mt-16 bg-gradient-to-r from-green-600 to-blue-600 text-white p-8 rounded-lg text-center">
        <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
        <p className="text-xl mb-6">
          Get the latest insights on service booking trends and platform updates delivered to your inbox.
        </p>
        <div className="max-w-md mx-auto flex gap-2">
          <input 
            type="email" 
            placeholder="Enter your email"
            className="flex-1 px-4 py-2 rounded-lg text-gray-900"
          />
          <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Subscribe
          </button>
        </div>
      </div>

      {/* SEO Content */}
      <div className="mt-16 prose prose-lg max-w-none">
        <h2 className="text-2xl font-bold mb-4">About Our Blog</h2>
        <p className="text-gray-700 leading-relaxed">
          The Bookiji blog is your go-to resource for understanding the evolving landscape of service booking 
          and the on-demand economy. We cover everything from industry trends and technological innovations 
          to practical tips for both service providers and customers.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Our team of experts shares insights on how platforms like Bookiji are transforming traditional 
          service industries through features like guaranteed bookings, AI-powered matching, and privacy-first 
          location services. Whether you're a service provider looking to grow your business or a customer 
          seeking the best booking experience, our blog has something for you.
        </p>
      </div>
    </div>
  )
} 