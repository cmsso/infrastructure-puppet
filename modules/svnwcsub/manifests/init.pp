
class svnwcsub (
    $uid            = $svnwcsub::params::uid,
    $gid            = $svnwcsub::params::gid,
    $conf_file      = $svnwcsub::params::conf_file,
    $service_ensure = $svnwcsub::params::service_ensure
) inherits svnwcsub::params {
    
    require stdlib

    unless is_integer($uid) {
        fail('Invalid UID. Should be integer')
    }

    validate_string($service_ensure)


    anchor { 'svnwcsub::begin': } ->
    class { '::svnwcsub::user': } ->
    class { '::svnwcsub::config': } ~>
    class { '::svnwcsub::service': } ->
    anchor { 'svnwcsub::end': }
}
